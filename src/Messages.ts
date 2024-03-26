import { EmbedBuilder } from 'discord.js';

const success = (title: string = 'Successful') =>
  new EmbedBuilder().setColor('Green').setTitle(title);

const info = (title: string = 'Info') =>
  new EmbedBuilder().setColor('Blue').setTitle(title);

const error = (title: string = 'Error') =>
  new EmbedBuilder().setColor('Red').setTitle(title);

export default {
  success,
  info,
  error,
};
