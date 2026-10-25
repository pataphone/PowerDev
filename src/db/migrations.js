const fs = require('node:fs');

// Schema migrations. The database remembers how many have run (PRAGMA user_version).
// Rules: append new migrations to the END of the array and never edit an old one.
const migrations = [
  // v1: tags (many per entry), comments, user roles, importance.
  // Also upgrades the original schema (entries.category) and keeps all existing rows.
  (db) => {
    const hasLegacy = hasTable(db, 'entries');
    if (hasLegacy) db.exec('ALTER TABLE entries RENAME TO entries_legacy');

    db.exec(`
      CREATE TABLE entries (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        text        TEXT NOT NULL,
        importance  INTEGER NOT NULL DEFAULT 2,
        author_id   TEXT,
        author_name TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE tags (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE
      );

      CREATE TABLE entry_tags (
        entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        tag_id   INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (entry_id, tag_id)
      );
      CREATE INDEX idx_entry_tags_tag ON entry_tags(tag_id);

      CREATE TABLE comments (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_id    INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        author_id   TEXT,
        author_name TEXT,
        text        TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_comments_entry ON comments(entry_id);

      CREATE TABLE users (
        discord_id TEXT PRIMARY KEY,
        role       TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    if (hasLegacy) {
      db.exec(`
        INSERT INTO entries (id, text, author_name, created_at, updated_at)
          SELECT id, text, author, created_at, created_at FROM entries_legacy;

        INSERT OR IGNORE INTO tags (name)
          SELECT DISTINCT replace(lower(trim(category)), ' ', '-') FROM entries_legacy;

        INSERT OR IGNORE INTO entry_tags (entry_id, tag_id)
          SELECT l.id, t.id
          FROM entries_legacy l
          JOIN tags t ON t.name = replace(lower(trim(l.category)), ' ', '-');

        DROP TABLE entries_legacy;
      `);
    }
  },
];

function hasTable(db, name) {
  return Boolean(
    db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name)
  );
}

function runMigrations(db, { dbPath } = {}) {
  const current = db.pragma('user_version', { simple: true });

  // Safety net: keep a copy of a pre-existing database before the first migration.
  if (current === 0 && hasTable(db, 'entries') && dbPath && dbPath !== ':memory:') {
    fs.copyFileSync(dbPath, `${dbPath}.pre-migration.bak`);
  }

  for (let version = current; version < migrations.length; version++) {
    db.transaction(() => {
      migrations[version](db);
      db.pragma(`user_version = ${version + 1}`);
    })();
  }
}

module.exports = { runMigrations, migrations };
