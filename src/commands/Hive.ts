import {SlashCommandBuilder} from '@discordjs/builders';
import {ChannelType} from 'discord.js';
import {Command} from '../Command';
import {generateTextFromDiscordMessages} from '../markov/DiscordMarkovGenerator';
import Messages from '../Messages';

export default new Command({
  builder: new SlashCommandBuilder()
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Channel to post to.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('query').setDescription('Markov query.').setRequired(false)
    )
    .setName('hive')
    .setDescription('Impersonate with the hive mind of the whole guild'),

  run: async ({interaction, client}) => {
    await interaction.deleteReply();

    const channelId = interaction.options.get('channel')!.value as string;
    const channel = await client.channels.fetch(channelId);

    if (channel == null) {
      await interaction.followUp({
        embeds: [Messages.error().setDescription('Channel not found.')],
      });

      return;
    }

    if (channel.type != ChannelType.GuildText) {
      await interaction.followUp({
        embeds: [
          Messages.error().setDescription('Channel is not a text channel.'),
        ],
      });

      return;
    }

    const query = interaction.options.get('query')?.value as string;
    await generateTextFromDiscordMessages({
      client,
      guildId: channel.guild.id,
      channel,
      query,
    });
  },
});
