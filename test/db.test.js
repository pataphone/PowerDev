// Uses an in-memory database, so nothing is written to disk.
process.env.DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');

const entries = require('../src/db/entries');
const tagStore = require('../src/db/tags');
const comments = require('../src/db/comments');
const { runMigrations } = require('../src/db/migrations');
const { ValidationError, NotFoundError } = require('../src/utils/errors');

test('creates an entry with normalized tags and default importance', () => {
  const entry = entries.createEntry({ text: '  hello  ', tags: '#Game, dark mode game' });
  assert.equal(entry.text, 'hello');
  assert.deepEqual(entry.tags, ['dark', 'game', 'mode']);
  assert.equal(entry.importance, 2);
});

test('rejects empty text and unknown importance', () => {
  assert.throws(() => entries.createEntry({ text: '   ' }), ValidationError);
  assert.throws(() => entries.createEntry({ text: 'x', importance: 'urgent' }), ValidationError);
});

test('filters by tags with any/all matching', () => {
  entries.createEntry({ text: 'f1', tags: ['filter-a', 'filter-b'] });
  entries.createEntry({ text: 'f2', tags: ['filter-a'] });
  entries.createEntry({ text: 'f3', tags: ['filter-b'] });

  const any = entries.listEntries({ tags: ['filter-a', 'filter-b'], match: 'any' });
  const all = entries.listEntries({ tags: ['filter-a', 'filter-b'], match: 'all' });
  assert.equal(any.total, 3);
  assert.equal(all.total, 1);
  assert.equal(all.entries[0].text, 'f1');
});

test('search treats % and _ literally', () => {
  entries.createEntry({ text: '100% done', tags: ['search-test'] });
  entries.createEntry({ text: 'plain', tags: ['search-test'] });
  assert.equal(entries.listEntries({ search: '100%' }).total, 1);
  assert.equal(entries.listEntries({ search: '_' }).total, 0);
});

test('paginates newest first', () => {
  for (let i = 0; i < 5; i++) entries.createEntry({ text: `page-${i}`, tags: ['paging'] });
  const first = entries.listEntries({ tags: ['paging'], limit: 2, offset: 0 });
  const second = entries.listEntries({ tags: ['paging'], limit: 2, offset: 2 });
  assert.equal(first.total, 5);
  assert.deepEqual(first.entries.map((e) => e.text), ['page-4', 'page-3']);
  assert.deepEqual(second.entries.map((e) => e.text), ['page-2', 'page-1']);
});

test('updates text, importance and tags', () => {
  const entry = entries.createEntry({ text: 'old', tags: ['upd'] });
  const updated = entries.updateEntry(entry.id, { text: 'new', importance: 'high' });
  assert.equal(updated.text, 'new');
  assert.equal(updated.importance, 3);
  assert.deepEqual(entries.setEntryTags(entry.id, ['x1', 'x2']).tags, ['x1', 'x2']);
  assert.throws(() => entries.updateEntry(999999, { text: 'nope' }), NotFoundError);
});

test('renaming a tag to an existing one merges them', () => {
  entries.createEntry({ text: 'm1', tags: ['merge-from'] });
  entries.createEntry({ text: 'm2', tags: ['merge-from', 'merge-to'] });
  const result = tagStore.renameTag('merge-from', 'merge-to');
  assert.equal(result.merged, true);
  assert.equal(entries.listEntries({ tags: ['merge-to'] }).total, 2);
  assert.equal(entries.listEntries({ tags: ['merge-from'] }).total, 0);
});

test('deleting a tag keeps the entries', () => {
  const entry = entries.createEntry({ text: 'keep me', tags: ['doomed'] });
  assert.equal(tagStore.deleteTag('doomed').affected, 1);
  assert.deepEqual(entries.getEntry(entry.id).tags, []);
});

test('bulk operations require a filter', () => {
  assert.throws(() => entries.bulkRetag({}, { add: ['x'] }), ValidationError);
  assert.throws(() => entries.deleteEntriesWhere({}), ValidationError);
});

test('bulk retag and bulk delete', () => {
  entries.createEntry({ text: 'b1', tags: ['bulk-src'] });
  entries.createEntry({ text: 'b2', tags: ['bulk-src'] });
  assert.equal(entries.bulkRetag({ tags: ['bulk-src'] }, { add: ['bulk-dst'], remove: ['bulk-src'] }), 2);
  assert.equal(entries.listEntries({ tags: ['bulk-dst'] }).total, 2);
  assert.equal(entries.listEntries({ tags: ['bulk-src'] }).total, 0);
  assert.equal(entries.deleteEntriesWhere({ tags: ['bulk-dst'] }), 2);
  assert.equal(entries.listEntries({ tags: ['bulk-dst'] }).total, 0);
});

test('comments are stored and deleted with their entry', () => {
  const entry = entries.createEntry({ text: 'commented' });
  comments.addComment({ entryId: entry.id, text: 'first', authorName: 'a' });
  comments.addComment({ entryId: entry.id, text: 'second', authorName: 'b' });
  assert.deepEqual(comments.listComments(entry.id).map((c) => c.text), ['first', 'second']);
  assert.throws(() => comments.addComment({ entryId: 999999, text: 'x' }), NotFoundError);
  entries.deleteEntry(entry.id);
  assert.equal(comments.listComments(entry.id).length, 0);
});

test('migration upgrades the legacy single-category schema without losing rows', () => {
  const legacy = new Database(':memory:');
  legacy.pragma('foreign_keys = ON');
  legacy.exec(`
    CREATE TABLE entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      author TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO entries (category, text, author) VALUES
      ('Long Term', 'idea one', 'alice'),
      ('long term', 'idea two', 'bob'),
      ('bug', 'idea three', NULL);
  `);

  runMigrations(legacy);

  const rows = legacy.prepare('SELECT id, text, author_name FROM entries ORDER BY id').all();
  assert.deepEqual(rows.map((r) => [r.id, r.text, r.author_name]), [
    [1, 'idea one', 'alice'],
    [2, 'idea two', 'bob'],
    [3, 'idea three', null],
  ]);
  const tags = legacy
    .prepare(
      `SELECT et.entry_id AS id, t.name AS name FROM entry_tags et
       JOIN tags t ON t.id = et.tag_id ORDER BY et.entry_id`
    )
    .all();
  assert.deepEqual(tags.map((t) => [t.id, t.name]), [[1, 'long-term'], [2, 'long-term'], [3, 'bug']]);
  assert.equal(legacy.pragma('user_version', { simple: true }), 1);

  // Running again is a no-op.
  runMigrations(legacy);
  assert.equal(legacy.prepare('SELECT COUNT(*) AS n FROM entries').get().n, 3);
});
