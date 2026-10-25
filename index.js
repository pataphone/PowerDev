// Single entry point: starts the HTTP API and the Discord bot in one process
// (one process = one Render service, one SQLite file).
const config = require('./src/config');
require('./src/db/connection'); // opens the database and runs pending migrations
const { startApi } = require('./src/api/server');
const { startBot } = require('./src/bot');

process.on('unhandledRejection', (error) => console.error('Unhandled rejection:', error));

if (config.API_KEY) {
  startApi();
} else {
  console.warn('API_KEY is not set: the HTTP API is disabled.');
}

startBot();
