// Registers slash commands with Discord. Run it once, and again whenever command definitions,
// roles, forms or importance levels change:   npm run register
//
// The command list is built from the files in src/bot/commands, so there is nothing to keep in sync.
// The database is not needed here, so we point it at memory to avoid creating/migrating a real file.
process.env.DB_PATH = ':memory:';

const path = require('node:path');
const { REST, Routes } = require('discord.js');
const config = require('./src/config');
const { loadModules } = require('./src/bot/loader');

const { DISCORD_TOKEN, APP_ID, GUILD_ID } = config;
if (!DISCORD_TOKEN || !APP_ID) {
  throw new Error('DISCORD_TOKEN and APP_ID must be set in your .env file.');
}

const commands = loadModules(path.join(__dirname, 'src', 'bot', 'commands'))
  .filter((command) => 'data' in command && 'execute' in command)
  .map((command) => command.data.toJSON());

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash commands...`);
    // A guild registration updates instantly; a global one can take a while to appear.
    const route = GUILD_ID
      ? Routes.applicationGuildCommands(APP_ID, GUILD_ID)
      : Routes.applicationCommands(APP_ID);
    await rest.put(route, { body: commands }); // replaces the whole list (old commands disappear)
    console.log('Slash commands were registered successfully!');
  } catch (error) {
    console.error('There was an error:', error);
    process.exitCode = 1;
  }
})();
