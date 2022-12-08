import {setTimeout} from 'timers/promises';

import {SlashCommandBuilder} from '@discordjs/builders';

import {Command} from '../Command';

export default new Command({
  disabled: true,

  builder: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with pong.'),

  run: async ({interaction}) => {
    await interaction.editReply({content: 'Ping 1'});
    await setTimeout(5000);
    await interaction.editReply({content: 'Ping 2'});
    await setTimeout(1000);
    await interaction.deleteReply();
  },
});
