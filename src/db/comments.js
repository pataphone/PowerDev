const db = require('./connection');
const config = require('../config');
const { ValidationError, NotFoundError } = require('../utils/errors');

function toComment(row) {
  return {
    id: row.id,
    entryId: row.entry_id,
    text: row.text,
    authorId: row.author_id,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}

function addComment({ entryId, text, authorId = null, authorName = null }) {
  const value = String(text ?? '').trim();
  if (!value) throw new ValidationError('Comment cannot be empty.');
  if (value.length > config.MAX_COMMENT_TEXT) {
    throw new ValidationError(`Comment is too long (max ${config.MAX_COMMENT_TEXT} characters).`);
  }
  if (!db.prepare('SELECT 1 FROM entries WHERE id = ?').get(entryId)) {
    throw new NotFoundError(`Entry #${entryId} not found.`);
  }
  const info = db
    .prepare('INSERT INTO comments (entry_id, text, author_id, author_name) VALUES (?, ?, ?, ?)')
    .run(entryId, value, authorId, authorName);
  return toComment(db.prepare('SELECT * FROM comments WHERE id = ?').get(info.lastInsertRowid));
}

// The latest `limit` comments, oldest first.
function listComments(entryId, limit = 5) {
  return db
    .prepare(
      `SELECT * FROM (SELECT * FROM comments WHERE entry_id = ? ORDER BY id DESC LIMIT ?)
       ORDER BY id ASC`
    )
    .all(entryId, limit)
    .map(toComment);
}

module.exports = { addComment, listComments };
