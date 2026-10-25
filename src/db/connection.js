const Database = require('better-sqlite3');
const config = require('../config');
const { runMigrations } = require('./migrations');

const db = new Database(config.DB_PATH);
db.pragma('foreign_keys = ON');
runMigrations(db, { dbPath: config.DB_PATH });

module.exports = db;
