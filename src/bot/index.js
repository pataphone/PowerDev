const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const config = require('../config');
const { loadModules } = require('./loader');

// Creates the client and wires up everything found in commands/, components/ and events/.
// To add a command, drop a file in commands/ (see CONTRIBUTING.md): no changes needed here.
function startBot() {
  if (!config.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is missing. Add it to your .env file.');

  // Slash commands, buttons and modals only need the Guilds intent.
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.commands = new Collection();
  for (const command of loadModules(path.join(__dirname, 'commands'))) {
    if ('data' in command && 'execute' in command) client.commands.set(command.data.name, command);
  }

  client.components = new Collection();
  for (const component of loadModules(path.join(__dirname, 'components'))) {
    client.components.set(component.id, component);
  }

  for (const event of loadModules(path.join(__dirname, 'events'))) {
    const register = event.once ? 'once' : 'on';
    client[register](event.name, (...args) => event.execute(...args));
  }
  client.on(Events.Error, (error) => console.error('Discord client error:', error));

  return client.login(config.DISCORD_TOKEN);
}

module.exports = { startBot };
