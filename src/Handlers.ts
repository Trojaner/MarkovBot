import {CommandInteraction} from 'discord.js';
import {setTimeout} from 'timers/promises';

import {Event} from './Event';
import MarkovClient from './MarkovClient';
import messages from './Messages';

export function handleEvent(client: MarkovClient, event: Event) {
  const avoidException = async (...args: any) => {
    try {
      await event.run(client, ...args);
    } catch (error) {
      console.error(`An error occurred in '${event.name}' event.\n${error}\n`);
    }
  };

  client.on(event.name, avoidException);
}

export async function handleCommand(
  client: MarkovClient,
  interaction: CommandInteraction
) {
  await interaction.deferReply({
    fetchReply: true,
  });

  const {commandName} = interaction;
  const command = client.commands.get(commandName);

  if (!command)
    return await interaction.followUp({
      ephemeral: true,
      embeds: [messages.error().setDescription('Command not found.')],
    });

  try {
    await command.run({
      client,
      interaction,
    });
  } catch (error) {
    console.error(`An error occurred in '${command.builder.name}' command.`);
    console.error(error);

    await interaction.editReply({
      options: {
        ephemeral: true,
      },
      embeds: [
        messages
          .error()
          .setDescription('An error occurred, please try again later.'),
      ],
    });

    await setTimeout(2500);
    await interaction.deleteReply();
  }

  return null;
}
