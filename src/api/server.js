const crypto = require('node:crypto');
const express = require('express');
const config = require('../config');
const entries = require('../db/entries');
const comments = require('../db/comments');
const tagStore = require('../db/tags');
const { parseTags } = require('../utils/tags');
const { ValidationError, NotFoundError, PermissionError } = require('../utils/errors');

// HTTP API for other programs. It talks to the same database layer as the bot.
// Every route except /health needs the X-API-Key header. API clients are fully trusted:
// Discord roles (src/permissions) only apply to Discord users.

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new ValidationError('Invalid id.');
  return id;
}

function createApp() {
  const app = express();
  app.use(express.json());

  // Unauthenticated: handy for uptime pings and hosting health checks.
  app.get('/health', (req, res) => res.json({ ok: true }));

  app.use((req, res, next) => {
    if (!safeEqual(req.get('x-api-key') || '', config.API_KEY)) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    next();
  });

  // GET /entries?tags=a,b&match=any|all&q=text&limit=20&offset=0   ("category" works as an alias of "tags")
  app.get('/entries', (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const result = entries.listEntries({
      tags: parseTags(req.query.tags ?? req.query.category),
      match: req.query.match === 'all' ? 'all' : 'any',
      search: req.query.q ? String(req.query.q) : undefined,
      limit,
      offset,
    });
    res.set('X-Total-Count', String(result.total));
    res.json(result.entries);
  });

  // POST /entries  { text, tags: ["a"], importance: "low|normal|high", author }
  app.post('/entries', (req, res) => {
    const body = req.body || {};
    const entry = entries.createEntry({
      text: body.text,
      tags: parseTags(body.tags ?? body.category),
      importance: body.importance,
      authorName: body.author ?? null,
    });
    res.status(201).json(entry);
  });

  app.get('/entries/:id', (req, res) => {
    const entry = entries.requireEntry(parseId(req.params.id));
    res.json({ ...entry, comments: comments.listComments(entry.id, 100) });
  });

  // PATCH /entries/:id  { text?, importance?, tags? }
  app.patch('/entries/:id', (req, res) => {
    const id = parseId(req.params.id);
    const body = req.body || {};
    entries.requireEntry(id);
    entries.updateEntry(id, { text: body.text, importance: body.importance });
    if (body.tags !== undefined) entries.setEntryTags(id, body.tags);
    res.json(entries.getEntry(id));
  });

  app.delete('/entries/:id', (req, res) => {
    if (!entries.deleteEntry(parseId(req.params.id))) throw new NotFoundError('Entry not found.');
    res.json({ ok: true });
  });

  // POST /entries/:id/comments  { text, author }
  app.post('/entries/:id/comments', (req, res) => {
    const body = req.body || {};
    const comment = comments.addComment({
      entryId: parseId(req.params.id),
      text: body.text,
      authorName: body.author ?? null,
    });
    res.status(201).json(comment);
  });

  app.get('/tags', (req, res) => res.json(tagStore.listTags()));

  app.use((req, res) => res.status(404).json({ error: 'not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
    if (error instanceof PermissionError) return res.status(403).json({ error: error.message });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid JSON' });
    console.error(error);
    res.status(500).json({ error: 'internal error' });
  });

  return app;
}

function startApi() {
  createApp().listen(config.PORT, config.HOST, () => {
    console.log(`API listening on http://${config.HOST}:${config.PORT}`);
  });
}

module.exports = { createApp, startApi };
