const entries = require('../../db/entries');
const comments = require('../../db/comments');
const permissions = require('../../permissions');
const { parseTags } = require('../../utils/tags');
const { parseImportance, getImportance } = require('../../utils/importance');
const { NotFoundError } = require('../../utils/errors');
const { FORMS } = require('../forms');
const { entryEmbed } = require('../ui/embeds');
const { entryActions, confirmRow } = require('../ui/buttons');
const { renderListPage } = require('../ui/listView');
const modals = require('../ui/modals');
const { getSession } = require('../sessions');
const { ephemeral, readField, componentIds } = require('../helpers');

// Buttons and modals under entries.   Custom IDs: entry:<action>:<entryId>
//   buttons: add_more, edit, tags, comment, delete, delete_yes
//   modals:  edit, tags, comment

function loadEntry(id) {
  const entry = entries.getEntry(Number(id));
  if (!entry) throw new NotFoundError(`Entry #${id} no longer exists.`);
  return entry;
}

// Rebuilds the message a button/modal came from, so it shows fresh data.
// Messages that are part of a /list session keep their pagination.
function renderMessageView(interaction, entry) {
  const ids = componentIds(interaction.message);
  for (const id of ids) {
    const match = /^list:at:(\w+):(\d+)$/.exec(id);
    const session = match && getSession(match[1]);
    if (session) return renderListPage(session, match[1], Number(match[2]));
  }
  return {
    content: null,
    embeds: [entryEmbed(entry, { comments: comments.listComments(entry.id) })],
    components: entryActions(entry, interaction.user.id, {
      addMore: ids.some((id) => id.startsWith('entry:add_more:')),
    }),
  };
}

async function showUpdated(interaction, entry) {
  if (typeof interaction.isFromMessage === 'function' && interaction.isFromMessage()) {
    return interaction.update(renderMessageView(interaction, entry));
  }
  return interaction.reply({ ...ephemeral(`Updated #${entry.id}.`), embeds: [entryEmbed(entry)] });
}

module.exports = {
  id: 'entry',

  async button(interaction, [action, id]) {
    const userId = interaction.user.id;
    const entry = loadEntry(id);

    switch (action) {
      case 'add_more':
        permissions.assertCanOnEntry(userId, entry, 'edit');
        return interaction.showModal(
          modals.formModal(FORMS.quick, {
            customId: 'submit:quick',
            defaults: {
              tags: entry.tags.join(', '),
              importance: getImportance(entry.importance).label.toLowerCase(),
            },
          })
        );

      case 'edit':
        permissions.assertCanOnEntry(userId, entry, 'edit');
        return interaction.showModal(modals.editEntryModal(entry));

      case 'tags':
        permissions.assertCanOnEntry(userId, entry, 'edit');
        return interaction.showModal(modals.editTagsModal(entry));

      case 'comment':
        permissions.assertCan(userId, 'entry.comment');
        return interaction.showModal(modals.commentModal(entry));

      case 'delete':
        permissions.assertCanOnEntry(userId, entry, 'delete');
        return interaction.reply({
          ...ephemeral(`Delete entry #${entry.id}? This cannot be undone.`),
          components: [confirmRow(`entry:delete_yes:${entry.id}`, 'Delete')],
        });

      case 'delete_yes':
        permissions.assertCanOnEntry(userId, entry, 'delete');
        entries.deleteEntry(entry.id);
        return interaction.update({ content: `Entry #${entry.id} deleted.`, components: [] });
    }
  },

  async modal(interaction, [action, id]) {
    const user = interaction.user;
    const entry = loadEntry(id);

    switch (action) {
      case 'edit': {
        permissions.assertCanOnEntry(user.id, entry, 'edit');
        const rawImportance = readField(interaction, 'importance').trim();
        const updated = entries.updateEntry(entry.id, {
          text: readField(interaction, 'text'),
          importance: rawImportance ? parseImportance(rawImportance) : entry.importance,
        });
        return showUpdated(interaction, updated);
      }

      case 'tags': {
        permissions.assertCanOnEntry(user.id, entry, 'edit');
        const updated = entries.setEntryTags(entry.id, parseTags(readField(interaction, 'tags')));
        return showUpdated(interaction, updated);
      }

      case 'comment': {
        permissions.assertCan(user.id, 'entry.comment');
        comments.addComment({
          entryId: entry.id,
          text: readField(interaction, 'text'),
          authorId: user.id,
          authorName: user.username,
        });
        return showUpdated(interaction, entry);
      }
    }
  },
};
