const crypto = require('node:crypto');

// Short-lived in-memory state for interactive messages (list pagination, confirmations).
// Button custom IDs are limited to 100 characters, so we keep the filter here and only put
// a short session ID in the button. After a restart or 30 minutes, old buttons say "expired".
const TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 500;
const sessions = new Map();

function prune() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expiresAt < now) sessions.delete(id);
  }
  while (sessions.size > MAX_SESSIONS) sessions.delete(sessions.keys().next().value);
}

function createSession(data) {
  prune();
  const id = crypto.randomBytes(4).toString('hex');
  sessions.set(id, { ...data, expiresAt: Date.now() + TTL_MS });
  return id;
}

function getSession(id) {
  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(id);
    return null;
  }
  session.expiresAt = Date.now() + TTL_MS;
  return session;
}

function deleteSession(id) {
  sessions.delete(id);
}

module.exports = { createSession, getSession, deleteSession };
