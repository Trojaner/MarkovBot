import {SlashCommandBuilder} from '@discordjs/builders';
import {Command} from '../Command';
import {generateStats} from '../markov/DiscordMarkovGenerator';

export default new Command({
  builder: new SlashCommandBuilder()
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to impersonate.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('The token to lookup.')
        .setRequired(false)
    )
    .setName('stats')
    .setDescription('Get stats about a user'),

  run: async ({interaction}) => {
    const userId = interaction.options.get('user')!.value as string;
    const query = interaction.options.get('query')?.value as string;

    await generateStats({
      userId,
      query,
      interaction,
    });
  },
});
