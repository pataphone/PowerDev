const db = require('./connection');
const config = require('../config');
const tagStore = require('./tags');
const { parseTags } = require('../utils/tags');
const { parseImportance } = require('../utils/importance');
const { ValidationError, NotFoundError } = require('../utils/errors');

const COLUMNS =
  'e.id, e.text, e.importance, e.author_id, e.author_name, e.created_at, e.updated_at';

function toEntry(row, tags) {
  return {
    id: row.id,
    text: row.text,
    importance: row.importance,
    tags,
    authorId: row.author_id,
    authorName: row.author_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Turns raw rows into entry objects with their tags (one extra query for all rows).
function withTags(rows) {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const marks = ids.map(() => '?').join(',');
  const links = db
    .prepare(
      `SELECT et.entry_id AS entry_id, t.name AS name
       FROM entry_tags et JOIN tags t ON t.id = et.tag_id
       WHERE et.entry_id IN (${marks})
       ORDER BY t.name`
    )
    .all(...ids);

  const byEntry = new Map();
  for (const { entry_id: entryId, name } of links) {
    if (!byEntry.has(entryId)) byEntry.set(entryId, []);
    byEntry.get(entryId).push(name);
  }
  return rows.map((row) => toEntry(row, byEntry.get(row.id) || []));
}

function cleanText(text) {
  const value = String(text ?? '').trim();
  if (!value) throw new ValidationError('Text cannot be empty.');
  if (value.length > config.MAX_ENTRY_TEXT) {
    throw new ValidationError(`Text is too long (max ${config.MAX_ENTRY_TEXT} characters).`);
  }
  return value;
}

function touch(id) {
  db.prepare("UPDATE entries SET updated_at = datetime('now') WHERE id = ?").run(id);
}

function getEntry(id) {
  const row = db.prepare(`SELECT ${COLUMNS} FROM entries e WHERE e.id = ?`).get(id);
  return row ? withTags([row])[0] : null;
}

function requireEntry(id) {
  const entry = getEntry(id);
  if (!entry) throw new NotFoundError(`Entry #${id} not found.`);
  return entry;
}

function createEntry({ text, tags = [], importance, authorId = null, authorName = null }) {
  const cleanedText = cleanText(text);
  const level = parseImportance(importance);
  const tagNames = parseTags(tags);

  return db.transaction(() => {
    const info = db
      .prepare('INSERT INTO entries (text, importance, author_id, author_name) VALUES (?, ?, ?, ?)')
      .run(cleanedText, level, authorId, authorName);
    const id = Number(info.lastInsertRowid);
    tagStore.addToEntry(id, tagNames);
    return getEntry(id);
  })();
}

function updateEntry(id, { text, importance } = {}) {
  const fields = [];
  const params = [];
  if (text !== undefined) {
    fields.push('text = ?');
    params.push(cleanText(text));
  }
  if (importance !== undefined) {
    fields.push('importance = ?');
    params.push(parseImportance(importance));
  }
  if (!fields.length) return requireEntry(id);

  fields.push("updated_at = datetime('now')");
  const info = db
    .prepare(`UPDATE entries SET ${fields.join(', ')} WHERE id = ?`)
    .run(...params, id);
  if (!info.changes) throw new NotFoundError(`Entry #${id} not found.`);
  return getEntry(id);
}

function setEntryTags(id, tags) {
  const tagNames = parseTags(tags);
  return db.transaction(() => {
    requireEntry(id);
    tagStore.replaceForEntry(id, tagNames);
    touch(id);
    return getEntry(id);
  })();
}

function deleteEntry(id) {
  return db.prepare('DELETE FROM entries WHERE id = ?').run(id).changes > 0;
}

// --- Filtering ---------------------------------------------------------------
// filter = { tags: string[] | string, match: 'any' | 'all', search: string }

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function hasFilter(filter = {}) {
  return parseTags(filter.tags || []).length > 0 || Boolean(filter.search);
}

function buildFilter({ tags = [], match = 'any', search } = {}) {
  const clauses = [];
  const params = [];
  const names = parseTags(tags);

  if (names.length) {
    const marks = names.map(() => '?').join(',');
    const base = `SELECT et.entry_id FROM entry_tags et JOIN tags t ON t.id = et.tag_id WHERE t.name IN (${marks})`;
    if (match === 'all') {
      clauses.push(`e.id IN (${base} GROUP BY et.entry_id HAVING COUNT(DISTINCT t.id) = ?)`);
      params.push(...names, names.length);
    } else {
      clauses.push(`e.id IN (${base})`);
      params.push(...names);
    }
  }
  if (search) {
    clauses.push("e.text LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLike(String(search))}%`);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function countEntries(filter) {
  const { where, params } = buildFilter(filter);
  return db.prepare(`SELECT COUNT(*) AS n FROM entries e ${where}`).get(...params).n;
}

// Newest first.
function listEntries({ limit = 20, offset = 0, ...filter } = {}) {
  const { where, params } = buildFilter(filter);
  const total = countEntries(filter);
  const rows = db
    .prepare(`SELECT ${COLUMNS} FROM entries e ${where} ORDER BY e.id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  return { total, entries: withTags(rows) };
}

function findEntryIds(filter) {
  const { where, params } = buildFilter(filter);
  return db
    .prepare(`SELECT e.id AS id FROM entries e ${where}`)
    .all(...params)
    .map((row) => row.id);
}

// --- Bulk operations ----------------------------------------------------------
// These always require a filter, so nobody wipes everything by accident.

function assertFilter(filter) {
  if (!hasFilter(filter)) {
    throw new ValidationError('Provide at least a tag filter or search text.');
  }
}

// Removes and/or adds tags on every entry matching the filter. Returns how many entries matched.
function bulkRetag(filter, { add = [], remove = [] } = {}) {
  assertFilter(filter);
  const addTags = parseTags(add);
  const removeTags = parseTags(remove);
  if (!addTags.length && !removeTags.length) {
    throw new ValidationError('Nothing to change: provide tags to add or remove.');
  }

  return db.transaction(() => {
    const ids = findEntryIds(filter);
    for (const id of ids) {
      tagStore.removeFromEntry(id, removeTags);
      tagStore.addToEntry(id, addTags);
      touch(id);
    }
    return ids.length;
  })();
}

function deleteEntriesWhere(filter) {
  assertFilter(filter);
  return db.transaction(() => {
    const ids = findEntryIds(filter);
    const remove = db.prepare('DELETE FROM entries WHERE id = ?');
    for (const id of ids) remove.run(id);
    return ids.length;
  })();
}

module.exports = {
  getEntry,
  requireEntry,
  createEntry,
  updateEntry,
  setEntryTags,
  deleteEntry,
  hasFilter,
  countEntries,
  listEntries,
  bulkRetag,
  deleteEntriesWhere,
};
