// Roles are plain objects. To add a role: add an entry below, run `npm run register`
// (so it appears in /admin role set), then assign it with /admin role set.
//
// Permissions used by the bot:
//   entry.create, entry.view            create and read entries
//   entry.edit.own, entry.delete.own    change entries the user created
//   entry.edit.any, entry.delete.any    change anyone's entries
//   entry.comment                       add comments
//   entry.bulk                          bulk retag / bulk delete by filter
//   tag.manage                          rename (merge) and delete tags
//   role.manage                         assign roles to users
//
// "*" grants everything. A role with an empty list can do nothing (useful for restricting a user).
// A user whose stored role no longer exists here gets no permissions.
const ROLES = {
  banned: {
    label: 'Banned',
    permissions: [],
  },
  user: {
    label: 'User',
    permissions: ['entry.create', 'entry.view', 'entry.edit.own', 'entry.delete.own'],
  },
  moderator: {
    label: 'Moderator',
    permissions: ['entry.create', 'entry.view', 'entry.edit.any', 'entry.comment'],
  },
  admin: {
    label: 'Admin',
    permissions: [
      'entry.create',
      'entry.view',
      'entry.edit.any',
      'entry.delete.any',
      'entry.comment',
      'entry.bulk',
      'tag.manage',
      'role.manage',
    ],
  },
};

// Everyone who has no assigned role.
const DEFAULT_ROLE = 'user';

module.exports = { ROLES, DEFAULT_ROLE };
