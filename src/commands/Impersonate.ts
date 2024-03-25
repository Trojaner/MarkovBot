import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../Command';
import { generateTextFromDiscordMessages } from '../markov/DiscordMarkovGenerator';

export default new Command({
  ephemeral: true,

  builder: new SlashCommandBuilder()
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('User to impersonate.')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Markov query.')
        .setRequired(false),
    )
    .setName('impersonate')
    .setDescription('Impersonate a user'),

  run: async ({ interaction, client }) => {
    const userId = interaction.options.get('user')!.value as string;
    const query = interaction.options.get('query')?.value as string;

    await generateTextFromDiscordMessages({
      client,
      query,
      interaction,
      userId,
    });
  },
});
