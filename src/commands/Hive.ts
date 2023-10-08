import {SlashCommandBuilder} from '@discordjs/builders';
import {Command} from '../Command';
import {generateTextFromDiscordMessages} from '../markov/DiscordMarkovGenerator';

export default new Command({
  ephemeral: true,

  builder: new SlashCommandBuilder()
    .addStringOption(option =>
      option.setName('query').setDescription('Markov query.').setRequired(false)
    )
    .setName('hive')
    .setDescription('Impersonate with the hive mind of the whole guild'),

  run: async ({interaction, client}) => {
    const query = interaction.options.get('query')?.value as string;

    await generateTextFromDiscordMessages({
      client,
      query,
      limit: 50000,
      interaction,
    });
  },
});
