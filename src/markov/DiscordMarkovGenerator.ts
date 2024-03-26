import {
  APIEmbed,
  APIEmbedField,
  CommandInteraction,
  JSONEncodable,
  TextChannel,
  Webhook,
  WebhookClient,
} from 'discord.js';
import { Op } from 'sequelize';
import { DbMessages, sequelize } from '../Database';
import MarkovClient from '../MarkovClient';
import { MarkovChain } from './MarkovChain';
import * as sw from 'stopword';
import * as natural from 'natural';
import { EmbedBuilder } from '@discordjs/builders';

const separator = '\u0091';
const commandPrefixes = ['!', '?', '-', '+', '#', '$', '%', '&'];

const normalize = (str: string) => {
  if(!str) {
    return '';
  }

  return str
    .replace(/['"]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

async function getMarkovChain({
  interaction,
  userId,
  limit,
}: {
  interaction: CommandInteraction;
  userId?: string;
  limit?: number;
}) {
  await interaction.guild!.fetch();

  const reply = await interaction.fetchReply();

  const channel = (await interaction.guild!.channels.fetch(
    reply.channelId,
  )) as TextChannel;

  if (!channel) {
    await interaction.followUp({
      content: 'Cannot run command here.',
      ephemeral: true,
    });

    return false;
  }

  const entries = await DbMessages.findAll({
    where: {
      user_id: userId || { [Op.ne]: null },
      guild_id: interaction.guild!.id,
      content: { [Op.ne]: '' },
    },
    order: sequelize.random(),
  });

  let messages = entries
    .map((x) => x.getDataValue<string>('content'))
    .filter((x) => !x.includes('https://'))
    .filter((x) => !x.includes('http://'))
    .filter((x) => !x.includes('```'))
    .map((x) => normalize(x || ''))
    .filter((x) => x.trim() !== '' && x.split(' ').length > 2)
    .filter(
      (x) =>
        !commandPrefixes.some(
          (prefix) =>
            x.startsWith(prefix) && x.split(' ')[0].length > prefix.length,
        ),
    )
    .map((x) => x + separator);

  if (messages.length === 0) {
    await interaction.followUp({
      content: 'No messages found. Import messages first.',
      ephemeral: true,
    });
    return false;
  }

  if (limit && limit > 0) {
    messages = messages.slice(0, limit);
  }

  let stopwords = sw.eng;
  if (
    process.env['TOKENIZER_LANGUAGE'] &&
    process.env['TOKENIZER_LANGUAGE'].trim() != ''
  ) {
    stopwords = [];
    let languages = process.env['TOKENIZER_LANGUAGE'].split(',');

    for (let lang of languages) {
      // @ts-ignore
      stopwords = stopwords.concat(sw[lang]);
    }
  }
  let pattern = /(?![\p{Z}\p{C}])[\p{L}\p{M}\p{S}\p{N}\p{P}]+/gmv;
  if (
    process.env['TOKENIZER_PATTERN'] &&
    process.env['TOKENIZER_PATTERN'].trim() != ''
  ) {
    pattern = new RegExp(process.env['TOKENIZER_PATTERN'], 'mvg');
  }

  const markovChain = new MarkovChain({
    minOrder: 1,
    maxOrder: 3,
    stopwords,
    tokenizer: new natural.RegexpTokenizer({
      pattern,
      gaps: false,
    }),
  });

  for (const msg of messages) {
    markovChain.addToCorpus(msg);
  }

  return {
    markovChain,
    channel,
    messages,
  };
}

export async function generateStats({
  interaction,
  userId,
  query,
}: {
  interaction: CommandInteraction;
  userId: string;
  query?: string;
}) {
  const markovResult = await getMarkovChain({
    interaction,
    userId,
  });

  if (!markovResult) {
    return;
  }

  const member = await markovResult.channel.guild.members.fetch({
    user: userId,
    cache: false,
  });

  let embeds: (JSONEncodable<APIEmbed> | APIEmbed)[] = [];

  const memberName =
    member.displayName || member.nickname || member.user.username;
  const avatarUrl = member.displayAvatarURL() || member.avatarURL() || null;
  const builder = new EmbedBuilder()
    .setThumbnail(avatarUrl)
    .setTitle(memberName);

  const messageCount = markovResult.messages.length;

  if (query) {
    query = query.split(' ')[0];

    const ngrams = markovResult.markovChain.getTopNgramFrequency(10, query);
    const fields: APIEmbedField[] = [];

    for (const pair of ngrams) {
      const ngram = pair[0];
      const frequency = pair[1];

      if (!ngram) {
        continue;
      }

      fields.push({
        name: ngram,
        value: `${frequency} (${((frequency / messageCount) * 100).toFixed(
          2,
        )}%)`,
        inline: true,
      });
    }

    builder.addFields(fields);
    embeds = [builder];
  } else {
    const stats = markovResult.markovChain.getTopNgramFrequency(10);
    const fields: APIEmbedField[] = [];

    for (const pair of stats) {
      const token = pair[0];
      const frequency = pair[1];

      fields.push({
        name: token,
        value: `${frequency} (${((frequency / messageCount) * 100).toFixed(
          2,
        )}%)`,
        inline: true,
      });
    }

    fields.push({
      name: 'Total parsable messages',
      value: messageCount.toFixed(0).toString(),
    });

    builder.addFields(fields);
    embeds = [builder.data];
  }

  await interaction.editReply({
    embeds,
    allowedMentions: {
      users: [],
    },
  });
}

async function getWebhookClient({ channel }: { channel: TextChannel }) {
  const webhooks = await channel.fetchWebhooks();
  let webhook: Webhook | undefined = webhooks.find(
    (x) => x.name === 'Markov Bot',
  );

  if (!webhook) {
    webhook = await channel.createWebhook({
      name: 'Markov Bot',
      reason: 'Markov user impersonation',
    });
  }

  return new WebhookClient({ url: webhook!.url });
}

export async function generateTextFromDiscordMessages({
  client,
  query,
  limit,
  interaction,
  userId,
}: {
  client: MarkovClient;
  query?: string;
  limit?: number;
  interaction: CommandInteraction;
  userId?: string;
}) {
  const markovResult = await getMarkovChain({
    interaction,
    userId,
    limit,
  });

  if (!markovResult) {
    return;
  }

  let key: string[];
  let input: string | null = null;
  if (query && query.length > 0) {
    input = normalize(query) || null;
  }

  if (input) {
    key = input.split(' ');
  } else {
    key = [normalize(markovResult.markovChain.randomStartToken())];
  }

  const maxTotalLength = 2000;
  const minTextLength = 25;

  let text = null;
  const untilFilter = (s: string[]) => {
    text = s ? normalize(s?.map((x) => x || '').join(' ')) : null;
    if (!text || text.length < minTextLength) {
      return false;
    }

    if (text === key.join(' ')) {
      return false;
    }

    const index = Math.min(text.indexOf(separator), text.indexOf('?'), text.indexOf('!'), text.indexOf('.'));
    if(index > 0) {
      text = normalize(text.substring(0, index + 1).replace(separator, ''));
      return true;
    }

    if (text.length >= maxTotalLength) {
      return true;
    }

    return false;
  };

  markovResult.markovChain.randomSequence(key.join(' '), untilFilter);

  if (!text || text === '' || text === key.join(' ')) {
    await interaction.followUp({
      content: 'Failed to generate message. Try a different query.',
      ephemeral: true,
    });

    return;
  }

  const webhookClient = await getWebhookClient({
    channel: markovResult.channel,
  });

  const member = userId
    ? await markovResult.channel.guild.members.fetch({
        user: userId,
        cache: false,
      })
    : null;

  const memberName =
    member?.displayName ||
    member?.nickname ||
    member?.user.username ||
    undefined;

  console.log(
    interaction.user.username +
      ' impersonates ' +
      (memberName || '<hive>') +
      ' in ' +
      markovResult.channel.name +
      ' with query ' +
      (query || '<none>'),
  );

  await interaction.deleteReply();

  if (member) {
    try {
      await webhookClient.send({
        content: text,
        avatarURL: member.displayAvatarURL() || member.avatarURL() || undefined,
        username: memberName,
        allowedMentions: {
          users: [],
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      if (e.toString().includes('USERNAME_INVALID')) {
        await webhookClient.send({
          content: text,
          avatarURL:
            member.displayAvatarURL() || member.avatarURL() || undefined,
          username: member.user.username,
          allowedMentions: {
            users: [],
          },
        });
      }
    }
  } else {
    const bot = await markovResult.channel.guild.members.fetch({
      user: client.user!.id,
      cache: false,
    });

    await webhookClient.send({
      content: text,
      avatarURL:
        interaction.guild?.iconURL({
          forceStatic: true,
        }) ||
        bot.displayAvatarURL() ||
        bot.avatarURL() ||
        undefined,
      username: interaction.guild?.name
        ? interaction.guild?.name + ' Hive Mind'
        : bot.displayName || bot.nickname || bot.user.username || undefined,
      allowedMentions: {
        users: [],
      },
    });
  }
}
