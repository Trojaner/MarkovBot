import {ClientEvents} from 'discord.js';

import MarkovClient from './MarkovClient';

export class Event {
  name!: keyof ClientEvents;

  run!: (client: MarkovClient, ...eventArgs: any) => any;

  constructor(options: NonNullable<Event>) {
    Object.assign(this, options);
  }
}
