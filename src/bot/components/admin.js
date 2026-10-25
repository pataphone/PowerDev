const entries = require('../../db/entries');
const permissions = require('../../permissions');
const { PermissionError } = require('../../utils/errors');
const { getSession, deleteSession } = require('../sessions');

// Confirmation buttons of /admin.   Custom ID: admin:bulk_delete:<sessionId>
module.exports = {
  id: 'admin',

  async button(interaction, [action, sessionId]) {
    if (action !== 'bulk_delete') return;

    const session = getSession(sessionId);
    if (!session) {
      return interaction.update({ content: 'This confirmation expired. Run the command again.', components: [] });
    }
    if (session.ownerId !== interaction.user.id) throw new PermissionError();
    permissions.assertCan(interaction.user.id, 'entry.bulk');

    deleteSession(sessionId); // one-time use
    const count = entries.deleteEntriesWhere(session.filter);
    await interaction.update({ content: `Deleted ${count} entries.`, components: [] });
  },
};
