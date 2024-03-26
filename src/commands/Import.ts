import { SlashCommandBuilder } from '@discordjs/builders';
import { ChannelType, Message, Snowflake } from 'discord.js';
import { Op } from 'sequelize';
import { Command } from '../Command';
import { DbMessages } from '../Database';
import Messages from '../Messages';

export default new Command({
  builder: new SlashCommandBuilder()
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Channel to import from.')
        .setRequired(true),
    )
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('User to import from.')
        .setRequired(false),
    )

    .setName('import')
    .setDescription('Import messages to database.'),

  run: async ({ interaction, client }) => {
    const channelId = interaction.options.get('channel')!.value as string;
    const channel = await client.channels.fetch(channelId);

    if (!channel) {
      await interaction.editReply({
        embeds: [Messages.error().setDescription('Channel not found.')],
      });

      return;
    }

    if (channel.type !== ChannelType.GuildText) {
      await interaction.editReply({
        embeds: [
          Messages.error().setDescription('Channel is not a text channel.'),
        ],
      });

      return;
    }

    const userId =
      (interaction.options.get('user')?.value as string) || undefined;

    if (interaction.user.id !== process.env.BOT_OWNER_ID) {
      await interaction.editReply({
        embeds: [Messages.error().setDescription('Permission denied.')],
      });

      return;
    }

    const latestMessage = await DbMessages.findOne({
      where: {
        channel_id: channelId,
        user_id: userId || { [Op.ne]: null },
      },
      order: [['time', 'DESC']],
    });

    let latestMessageId: Snowflake | undefined = undefined;
    let count = await DbMessages.count({
      where: {
        channel_id: channelId,
        user_id: userId || { [Op.ne]: null },
      },
    });

    if (latestMessage) {
      latestMessageId = latestMessage.getDataValue<Snowflake>('message_id');

      await interaction.followUp({
        embeds: [
          Messages.info().setDescription(
            `Continuing to import after message #${latestMessageId}`,
          ),
        ],
      });
    } else {
      latestMessageId = channel.id;

      await interaction.followUp({
        embeds: [
          Messages.info().setDescription(
            `Starting initial import.`,
          ),
        ],
      });
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const fetchedMessages = await channel.messages.fetch({
        after: latestMessageId,
        cache: false,
        limit: 100,
      });

      count += fetchedMessages.size;

      if (fetchedMessages.size === 0) {
        break;
      }

      const messages = fetchedMessages
        .map((x) => x)
        .filter(
          (message) =>
            !message.author.bot &&
            !message.author.system &&
            message.id !== latestMessageId,
        );

      latestMessageId = fetchedMessages.reduce(
        (prev: Message<true>, curr: Message<true>) => {
          return prev?.id > curr.id ? prev : curr;
        },
      ).id;

      if (messages.length === 0) {
        continue;
      }

      await DbMessages.bulkCreate(
        messages.map((message) => ({
          guild_id: message.guild.id,
          message_id: message.id,
          user_id: message.author.id,
          channel_id: message.channel.id,
          content: message.content,
          time: message.createdAt,
        })),
      );

      await interaction.editReply({
        embeds: [
          Messages.info('Importing...').setDescription('Imported messages: ' + count),
        ],
      });
    }

    await interaction.followUp({
      embeds: [
        Messages.success().setDescription(`Done: Imported ${count} messages`),
      ],
    });
  },
});
