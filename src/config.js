require('dotenv').config();

const env = process.env;
const list = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

// Importance levels. The key is what is stored in the database.
// Adding a level here makes it appear in commands, forms and embed colors.
// Run `npm run register` after changing it (slash command choices are generated from it).
const IMPORTANCE = {
  1: { label: 'Low', color: 0x6b7280 },
  2: { label: 'Normal', color: 0x3b82f6 },
  3: { label: 'High', color: 0xef4444 },
};

module.exports = {
  // Environment
  DISCORD_TOKEN: env.DISCORD_TOKEN,
  APP_ID: env.APP_ID,
  GUILD_ID: env.GUILD_ID,
  API_KEY: env.API_KEY,
  PORT: Number(env.PORT) || 3000,
  HOST: env.HOST || '0.0.0.0',
  DB_PATH: env.DB_PATH || 'ideas.db',
  OWNER_IDS: list(env.OWNER_IDS),

  // Limits
  MAX_ENTRY_TEXT: 3000,
  MAX_COMMENT_TEXT: 1000,
  MAX_TAGS_PER_ENTRY: 10,
  MAX_TAG_LENGTH: 32,

  // Importance
  IMPORTANCE,
  DEFAULT_IMPORTANCE: 2,
};
