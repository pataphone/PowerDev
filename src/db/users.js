const db = require('./connection');

// Only users with an explicitly assigned role are stored here.
// Everyone else gets DEFAULT_ROLE (see src/permissions/roles.js).

function getAssignedRole(discordId) {
  const row = db.prepare('SELECT role FROM users WHERE discord_id = ?').get(discordId);
  return row ? row.role : null;
}

function setRole(discordId, role) {
  db.prepare(
    `INSERT INTO users (discord_id, role) VALUES (?, ?)
     ON CONFLICT(discord_id) DO UPDATE SET role = excluded.role, updated_at = datetime('now')`
  ).run(discordId, role);
}

function clearRole(discordId) {
  return db.prepare('DELETE FROM users WHERE discord_id = ?').run(discordId).changes > 0;
}

function listAssignments() {
  return db
    .prepare('SELECT discord_id AS discordId, role FROM users ORDER BY role, discord_id')
    .all();
}

module.exports = { getAssignedRole, setRole, clearRole, listAssignments };
