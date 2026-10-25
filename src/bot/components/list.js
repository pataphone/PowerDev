const permissions = require('../../permissions');
const { getSession } = require('../sessions');
const { renderListPage } = require('../ui/listView');
const { ephemeral } = require('../helpers');

// Pagination buttons of /list.   Custom IDs: list:<prev|next>:<sessionId>:<page>
module.exports = {
  id: 'list',

  async button(interaction, [action, sessionId, page]) {
    if (action !== 'prev' && action !== 'next') return;

    const session = getSession(sessionId);
    if (!session) {
      return interaction.reply(ephemeral('This list has expired. Run /list again.'));
    }
    if (interaction.user.id !== session.ownerId) {
      return interaction.reply(ephemeral('Only the person who ran /list can change pages. Run /list yourself.'));
    }
    permissions.assertCan(interaction.user.id, 'entry.view');

    await interaction.update(renderListPage(session, sessionId, Number(page)));
  },
};
