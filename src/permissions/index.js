const config = require('../config');
const users = require('../db/users');
const { ROLES, DEFAULT_ROLE } = require('./roles');
const { PermissionError } = require('../utils/errors');

// Owners (OWNER_IDS) are always admins, so nobody can lock themselves out.
function getRoleId(userId) {
  if (config.OWNER_IDS.includes(userId)) return 'admin';
  return users.getAssignedRole(userId) || DEFAULT_ROLE;
}

function getRole(userId) {
  return ROLES[getRoleId(userId)] || { label: 'Unknown', permissions: [] };
}

function can(userId, permission) {
  const { permissions } = getRole(userId);
  return permissions.includes('*') || permissions.includes(permission);
}

// action: 'edit' | 'delete'. Own entries need "entry.<action>.own", others "entry.<action>.any".
function canOnEntry(userId, entry, action) {
  if (can(userId, `entry.${action}.any`)) return true;
  return Boolean(entry.authorId) && entry.authorId === userId && can(userId, `entry.${action}.own`);
}

function assertCan(userId, permission) {
  if (!can(userId, permission)) throw new PermissionError();
}

function assertCanOnEntry(userId, entry, action) {
  if (!canOnEntry(userId, entry, action)) throw new PermissionError();
}

module.exports = { getRoleId, getRole, can, canOnEntry, assertCan, assertCanOnEntry };
