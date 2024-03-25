import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize(process.env.CONNECTION_STRING as string);
export const DbMessages = sequelize.define(
  'messages',
  {
    message_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    guild_id: DataTypes.INTEGER,
    user_id: DataTypes.INTEGER,
    channel_id: DataTypes.INTEGER,
    content: DataTypes.STRING,
    time: DataTypes.DATE,
  },
  {
    timestamps: false,
  },
);
