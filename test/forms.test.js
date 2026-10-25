process.env.DB_PATH = ':memory:';

const test = require('node:test');
const assert = require('node:assert/strict');

const { FORMS, publicForms, buildEntryInput } = require('../src/bot/forms');
const { ValidationError } = require('../src/utils/errors');

test('every form fits Discord modal limits', () => {
  for (const [id, form] of Object.entries(FORMS)) {
    assert.ok(form.title.length <= 45, `${id}: modal title too long`);
    assert.ok(form.fields.length <= 5, `${id}: more than 5 fields`);
    for (const field of form.fields) {
      assert.ok(field.label.length <= 45, `${id}.${field.id}: label too long`);
    }
  }
});

test('hidden forms are not offered by /submit', () => {
  const ids = publicForms().map((form) => form.id);
  assert.ok(ids.includes('bug'));
  assert.ok(!ids.includes('quick'));
});

test('a bug report is merged into one text with auto tag, tags and importance', () => {
  const input = buildEntryInput(FORMS.bug, {
    title: 'Crash on start',
    actual: 'It crashes',
    steps: '1. Start',
    tags: 'startup, ui',
    importance: 'high',
  });
  assert.equal(input.text, 'Crash on start\n\n**What happened?**\nIt crashes\n\n**Steps to reproduce**\n1. Start');
  assert.deepEqual(input.tags, ['bug', 'startup', 'ui']);
  assert.equal(input.importance, 3);
});

test('empty optional fields are skipped and importance defaults to normal', () => {
  const input = buildEntryInput(FORMS.idea, { title: 'Just a title', details: '', tags: '', importance: '' });
  assert.equal(input.text, 'Just a title');
  assert.deepEqual(input.tags, ['idea']);
  assert.equal(input.importance, 2);
});

test('an invalid importance is rejected', () => {
  assert.throws(() => buildEntryInput(FORMS.idea, { title: 'x', importance: 'urgent' }), ValidationError);
});
