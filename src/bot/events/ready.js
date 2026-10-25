const { Events } = require('discord.js');

const STATUSES = [{ name: '/add' }, { name: '/list' }, { name: '/submit' }];

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`${client.user.tag} is online.`);
    setInterval(() => {
      client.user.setActivity(STATUSES[Math.floor(Math.random() * STATUSES.length)]);
    }, 10000);
  },
};
