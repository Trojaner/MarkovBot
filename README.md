# Discord Markov Bot

This bot can impersonate any Discord user's unique writing style. It can generate text based on prompts or it can be completely random.

As this bot needs to save all channel messages when importing it cannot be a public bot for privacy reasons. You must self-host it to use it on your own servers.

## Required permissions / intents

The bot needs the "Message Content" intent as it must be able to grab new messages.
It also needs the following permissions:

- Read Messages/View Channels
- Send Messages
- Read Message History
- Webhooks for channels where it can auto-reply or impersonate users

## How to run

### Setting up the database\*\*

Run the migration.sql file inside the db folder. If you are not using postgresql create a similar table manually instead.

### Setting up the environment

Create an .env file in the project's root directory with the following content (or pass as environment variables):

```
DISCORD_CLIENT_TOKEN="<your token>"
CONNECTION_STRING="<connection string>" # e.g. "postgres://postgres@localhost:5432/markov", see sequelizer documentation for more options
```

### Import messages

Import messages from your text channels. Run `/import \<channel\>` to import messages from a channel.  
The more messages you have, the better the results are. Avoid importing gibberish from e.g. #bot-commands channels.  
Regardless of that the bot will try to filter out unparsable messages like links or messages that seem like bot commands.

**YOU SHOULD AVOID IMPORTING MESSAGES WHEN RUNNING THE BOT ON YOUR OWN COMPUTER. DISCORD WILL RATE-LIMIT YOUR IP ADDRESS FOR A FEW HOURS. YOU WILL NOT BE ABLE TO USE YOUR DISCORD UNTIL THE RATE LIMIT EXPIRES OR YOUR IP ADDRESS CHANGES.**

## Using the bot

### Impersonate Users

After importing you can impersonate any user using the `/impersonate <user> <channel> [prompt]` command.  
The prompt parameter is optional and can include a few words that the generated message should start with.

## Todo:

- Dockerfile
- Periodic auto importing of messages
- Randomly reply as random user (to questions?)

## Credits:

The markov chain implementation is a modified version of [Sean S. LeBlanc](https://github.com/seleb/markov-multi-order) implementation.  
It was modified to generate better results with less randomness.
