import {
  CommandInteraction,
  TextChannel,
  Webhook,
  WebhookClient,
} from 'discord.js';
import {Op} from 'sequelize';
import {DbMessages} from '../Database';
import MarkovClient from '../MarkovClient';
import {MarkovChain} from './MarkovChain';
import * as sw from 'stopword';
import * as natural from 'natural';

interface IGenerateTextOptions {
  client: MarkovClient;
  query?: string;
  limit?: number;
  interaction: CommandInteraction;
  userId?: string;
}

const normalize = (str: string) => {
  return str
    .replace(/\s{2,}/g, ' ')
    .replace(/('")/g, '')
    .trim();
};

export async function generateTextFromDiscordMessages({
  client,
  query,
  limit,
  interaction,
  userId,
}: IGenerateTextOptions) {
  const reply = await interaction.fetchReply();
  await interaction.guild!.fetch();

  const channel = (await interaction.guild!.channels.fetch(
    reply.channelId
  )) as TextChannel;

  if (!channel) {
    await interaction.followUp({
      content: 'Cannot impersonate from here.',
      ephemeral: true,
    });
    return;
  }

  const entries = await DbMessages.findAll({
    where: {
      user_id: userId || {[Op.ne]: null},
      guild_id: interaction.guild!.id,
      content: {[Op.ne]: ''},
    },
  });

  const commandPrefixes = ['!', '?', '-', '+', '#', '$', '%', '&'];

  let messages = entries
    .map(x => x.getDataValue<string>('content'))
    .filter(x => !x.includes('https://'))
    .filter(x => !x.includes('http://'))
    .filter(x => !x.includes('`'))
    .map(x => normalize(x || ''))
    .filter(x => x !== '' && x.split(' ').length > 2)
    .filter(
      x => !commandPrefixes.some(prefix => x.startsWith(prefix) && x.length > 2)
    )
    .sort(() => Math.random() - 0.5)
    .map(x => (!x.endsWith('.') ? x + '.' : x));

  if (messages.length === 0) {
    await interaction.followUp({
      content: 'No messages found. Import messages first.',
      ephemeral: true,
    });
    return;
  }

  if (limit && limit > 0) {
    messages = messages.slice(0, limit);
  }

  const markovChain = new MarkovChain({
    minOrder: 2,
    maxOrder: 3,
    stopwords: sw.tur,
    tokenizer: new natural.WordTokenizer({
      pattern: /([\p{Script=Latin}'.?!:;,<>@]+|[0-9._]+|.|!|\?|:|;|,|-|<|@)/iu,
    }),
  });

  for (const msg of messages) {
    markovChain.addToCorpus(msg);
  }

  let key: string[];
  let input: string | null = null;
  if (query && query.length > 0) {
    input = normalize(query) || null;
  }

  if (input) {
    key = input.split(' ');
  } else {
    key = [normalize(markovChain.randomStartToken())];
  }

  const maxTotalLength = 2000;
  const minTextLength = 25;

  const untilFilter = (s: string[]) => {
    const text = s ? normalize(s?.join(' ')) : null;
    if (!text || text.length < minTextLength) {
      return false;
    }

    if (text === key.join(' ')) {
      return false;
    }

    if (text.length >= maxTotalLength) {
      return true;
    }

    return (
      text.endsWith('\0') ||
      text.endsWith('.') ||
      text.endsWith('?') ||
      text.endsWith('!')
    );
  };

  const result = markovChain
    .randomSequence(key.join(' '), untilFilter)
    .map(x => (x || '').replace(/\0/g, ''))
    .join(' ')
    .trim();

  if (result === '' || normalize(result) === key.join(' ')) {
    await interaction.followUp({
      content: 'Failed to generate message. Try a different query.',
      ephemeral: true,
    });
    return;
  }

  const webhooks = await channel.fetchWebhooks();
  let webhook: Webhook | undefined = webhooks.find(
    x => x.name === 'Markov Bot'
  );

  if (!webhook) {
    webhook = await channel.createWebhook({
      name: 'Markov Bot',
      reason: 'Markov user impersonation',
    });
  }

  const webhookClient = new WebhookClient({url: webhook!.url});

  const member = userId
    ? await channel.guild.members.fetch({
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
      channel.name +
      ' with query ' +
      (query || '<none>')
  );

  await interaction.deleteReply();

  if (member) {
    try {
      await webhookClient.send({
        content: result,
        avatarURL: member.displayAvatarURL() || member.avatarURL() || undefined,
        username: memberName,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      if (e.toString().includes('USERNAME_INVALID')) {
        await webhookClient.send({
          content: result,
          avatarURL:
            member.displayAvatarURL() || member.avatarURL() || undefined,
          username: member.user.username,
        });
      }
    }
  } else {
    const bot = await channel.guild.members.fetch({
      user: client.user!.id,
      cache: false,
    });

    await webhookClient.send({
      content: result,
      avatarURL:
        interaction.guild?.iconURL({
          forceStatic: true,
        }) ||
        bot.displayAvatarURL() ||
        bot.avatarURL() ||
        undefined,
      username:
        interaction.guild?.name ||
        bot.displayName ||
        bot.nickname ||
        bot.user.username ||
        undefined,
    });
  }
}
