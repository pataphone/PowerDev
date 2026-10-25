process.env.DB_PATH = ':memory:';
process.env.OWNER_IDS = 'owner-1, owner-2';

const test = require('node:test');
const assert = require('node:assert/strict');

const permissions = require('../src/permissions');
const users = require('../src/db/users');
const { PermissionError } = require('../src/utils/errors');

const ownEntry = { authorId: 'author-1' };

test('unlisted users get the default role', () => {
  assert.equal(permissions.getRoleId('stranger'), 'user');
  assert.equal(permissions.can('stranger', 'entry.create'), true);
  assert.equal(permissions.can('stranger', 'entry.bulk'), false);
});

test('users can edit and delete only their own entries', () => {
  assert.equal(permissions.canOnEntry('author-1', ownEntry, 'edit'), true);
  assert.equal(permissions.canOnEntry('author-1', ownEntry, 'delete'), true);
  assert.equal(permissions.canOnEntry('someone-else', ownEntry, 'edit'), false);
  assert.equal(permissions.canOnEntry('author-1', { authorId: null }, 'edit'), false);
});

test('owners are always admins', () => {
  assert.equal(permissions.getRoleId('owner-2'), 'admin');
  assert.equal(permissions.can('owner-2', 'role.manage'), true);
  assert.equal(permissions.canOnEntry('owner-2', ownEntry, 'delete'), true);
});

test('assigned roles are respected', () => {
  users.setRole('mod-1', 'moderator');
  assert.equal(permissions.can('mod-1', 'entry.comment'), true);
  assert.equal(permissions.canOnEntry('mod-1', ownEntry, 'edit'), true);
  assert.equal(permissions.canOnEntry('mod-1', ownEntry, 'delete'), false);

  users.setRole('admin-1', 'admin');
  assert.equal(permissions.canOnEntry('admin-1', ownEntry, 'delete'), true);

  users.clearRole('admin-1');
  assert.equal(permissions.getRoleId('admin-1'), 'user');
});

test('a banned user can do nothing', () => {
  users.setRole('bad-1', 'banned');
  assert.equal(permissions.can('bad-1', 'entry.view'), false);
  assert.throws(() => permissions.assertCan('bad-1', 'entry.create'), PermissionError);
});

test('an unknown stored role grants nothing', () => {
  users.setRole('ghost-1', 'role-that-was-removed');
  assert.equal(permissions.can('ghost-1', 'entry.view'), false);
});
