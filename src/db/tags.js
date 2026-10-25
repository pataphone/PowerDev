const db = require('./connection');
const { normalizeTag } = require('../utils/tags');
const { ValidationError, NotFoundError } = require('../utils/errors');

// Functions that take tag names expect them to be already normalized (see utils/tags.js),
// except renameTag/deleteTag which normalize their input themselves.

function ensureIds(names) {
  const insert = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  const select = db.prepare('SELECT id FROM tags WHERE name = ?');
  return names.map((name) => {
    insert.run(name);
    return select.get(name).id;
  });
}

function addToEntry(entryId, names) {
  const link = db.prepare('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)');
  for (const tagId of ensureIds(names)) link.run(entryId, tagId);
}

function removeFromEntry(entryId, names) {
  const unlink = db.prepare(
    'DELETE FROM entry_tags WHERE entry_id = ? AND tag_id IN (SELECT id FROM tags WHERE name = ?)'
  );
  for (const name of names) unlink.run(entryId, name);
}

function replaceForEntry(entryId, names) {
  db.prepare('DELETE FROM entry_tags WHERE entry_id = ?').run(entryId);
  addToEntry(entryId, names);
}

// Tags that are in use, most used first.
function listTags() {
  return db
    .prepare(
      `SELECT t.name AS name, COUNT(et.entry_id) AS count
       FROM tags t JOIN entry_tags et ON et.tag_id = t.id
       GROUP BY t.id
       ORDER BY count DESC, t.name`
    )
    .all();
}

// Renames a tag. If the new name already exists, the two tags are merged.
function renameTag(fromName, toName) {
  const from = normalizeTag(fromName);
  const to = normalizeTag(toName);
  if (!from || !to) throw new ValidationError('Tag names cannot be empty.');

  return db.transaction(() => {
    const source = db.prepare('SELECT id FROM tags WHERE name = ?').get(from);
    if (!source) throw new NotFoundError(`Tag "${from}" does not exist.`);

    const affected = db
      .prepare('SELECT COUNT(*) AS n FROM entry_tags WHERE tag_id = ?')
      .get(source.id).n;
    const target = db.prepare('SELECT id FROM tags WHERE name = ?').get(to);

    if (!target || target.id === source.id) {
      db.prepare('UPDATE tags SET name = ? WHERE id = ?').run(to, source.id);
      return { merged: false, affected };
    }

    db.prepare(
      'INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) SELECT entry_id, ? FROM entry_tags WHERE tag_id = ?'
    ).run(target.id, source.id);
    db.prepare('DELETE FROM tags WHERE id = ?').run(source.id); // cascades the old links
    return { merged: true, affected };
  })();
}

// Removes a tag from all entries. The entries themselves are kept.
function deleteTag(name) {
  const tag = normalizeTag(name);
  const row = db.prepare('SELECT id FROM tags WHERE name = ?').get(tag);
  if (!row) throw new NotFoundError(`Tag "${tag}" does not exist.`);
  const affected = db
    .prepare('SELECT COUNT(*) AS n FROM entry_tags WHERE tag_id = ?')
    .get(row.id).n;
  db.prepare('DELETE FROM tags WHERE id = ?').run(row.id);
  return { affected };
}

module.exports = {
  addToEntry,
  removeFromEntry,
  replaceForEntry,
  listTags,
  renameTag,
  deleteTag,
};
