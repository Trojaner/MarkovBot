import {
  GuildMember,
  Snowflake,
  TextChannel,
  Webhook,
  WebhookClient,
} from 'discord.js';
import {Op} from 'sequelize';
import {DbMessages} from '../Database';
import MarkovClient from '../MarkovClient';
import {Markov} from './Markov';

interface IGenerateTextOptions {
  client: MarkovClient;
  query?: string;
  userId?: Snowflake;
  guildId?: Snowflake;
  channel: TextChannel;
  limit?: number;
}

export async function generateTextFromDiscordMessages({
  client,
  query,
  userId,
  guildId,
  channel,
  limit,
}: IGenerateTextOptions) {
  const entries = await DbMessages.findAll({
    where: {
      user_id: userId || {[Op.ne]: null},
      guild_id: guildId || channel.guild.id,
      content: {[Op.ne]: ''},
    },
  });

  const commandPrefixes = ['!', '?', '-', '+', '@', '#', '$', '%', '&'];

  let messages = entries
    .map(x => x.getDataValue<string>('content'))
    .filter(x => !x.includes('https://'))
    .filter(x => !x.includes('http://'))
    .filter(x => !x.includes('```'))
    .map(x => Markov.normalize(x || ''))
    .filter(x => x !== '' && x.split(' ').length > 2)
    .filter(
      x => !commandPrefixes.some(prefix => x.startsWith(prefix) && x.length > 2)
    )
    .sort(() => Math.random() - 0.5)
    .map(x => (!x.endsWith('.') ? x + '.' : x));

  if (messages.length === 0) {
    console.error('No messages found');
    return;
  }

  if (limit && limit > 0) {
    messages = messages.slice(0, limit);
  }

  let input: string | null = null;
  if (query && query.length > 0) {
    input = Markov.normalize(query) || null;
  } else {
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const messageWords = randomMessage.split(' ');
    const randomWord = messageWords[0];
    input = Markov.normalize(randomWord);
  }

  const markov = new Markov({
    delimiter: ' ',
    minOrder: 1,
    maxOrder: 3,
    source: messages,
  });

  let key: string[];

  if (input) {
    key = input.split(' ');
  } else {
    key = markov.randomStartNgram().string;
  }

  const maxTotalLength = 2000;
  const randomWordCount = Math.floor(Math.random() * 47) + 3;

  const untilFilter = (s: string[]) => {
    const text = s ? Markov.normalize(s?.join(' ')) : null;
    return (text &&
      (text.endsWith('\0') ||
        text.length >= maxTotalLength ||
        s.length >= randomWordCount) &&
      text !== key.join(' ') &&
      text !== input) as boolean;
  };

  let result = markov
    .randomSequence(key.join(' '), untilFilter)
    .replace(/\0/g, '')
    .trim();

  if (result === '' || Markov.normalize(result) === input) {
    console.log('Failed to generate message');
    return;
  }

  while (result.endsWith('.')) {
    result = result.slice(0, -1);
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

  let member: GuildMember;
  if (userId) {
    member = await channel.guild.members.fetch(userId);
  } else {
    member = await channel.guild.members.fetch(client.user!.id);
  }

  try {
    await webhookClient.send({
      content: result,
      avatarURL: member.displayAvatarURL() || member.avatarURL() || undefined,
      username: member.displayName || member.nickname || member.user.username,
    });
  } catch (e: any) {
    if (e.toString().includes('USERNAME_INVALID')) {
      await webhookClient.send({
        content: result,
        avatarURL: member.displayAvatarURL() || member.avatarURL() || undefined,
        username: member.user.username,
      });
    }
  }
}
