import {CommandInteraction} from 'discord.js';
import {SlashCommandBuilder} from '@discordjs/builders';

import MarkovClient from './MarkovClient';

export type CommandArgs = {
  client: MarkovClient;
  interaction: CommandInteraction;
};

export class Command {
  ephemeral?: boolean;

  disabled?: boolean;

  builder!: SlashCommandBuilder;

  run!: (args: CommandArgs) => any;

  constructor(options: NonNullable<Command>) {
    Object.assign(this, options);
  }
}
