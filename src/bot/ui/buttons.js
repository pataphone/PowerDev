const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const permissions = require('../../permissions');

function button(customId, label, style = ButtonStyle.Secondary) {
  return new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style);
}

// Quick actions under an entry. Only shows what `userId` is allowed to do;
// permissions are checked again when a button is clicked (see components/entry.js).
// Custom ID format: entry:<action>:<entryId>
function entryActions(entry, userId, { addMore = false } = {}) {
  const canEdit = permissions.canOnEntry(userId, entry, 'edit');
  const buttons = [];

  if (addMore && canEdit) buttons.push(button(`entry:add_more:${entry.id}`, 'Add more', ButtonStyle.Success));
  if (canEdit) {
    buttons.push(button(`entry:edit:${entry.id}`, 'Edit'));
    buttons.push(button(`entry:tags:${entry.id}`, 'Edit tags'));
  }
  if (permissions.can(userId, 'entry.comment')) buttons.push(button(`entry:comment:${entry.id}`, 'Comment'));
  if (permissions.canOnEntry(userId, entry, 'delete')) {
    buttons.push(button(`entry:delete:${entry.id}`, 'Delete', ButtonStyle.Danger));
  }

  return buttons.length ? [new ActionRowBuilder().addComponents(buttons)] : [];
}

// Previous / current page / next. Custom ID format: list:<prev|next|at>:<sessionId>:<page>
function paginationRow(sessionId, page, pages) {
  return new ActionRowBuilder().addComponents(
    button(`list:prev:${sessionId}:${Math.max(page - 1, 0)}`, 'Previous').setDisabled(page <= 0),
    button(`list:at:${sessionId}:${page}`, `${page + 1} / ${pages}`).setDisabled(true),
    button(`list:next:${sessionId}:${Math.min(page + 1, pages - 1)}`, 'Next').setDisabled(page >= pages - 1)
  );
}

function confirmRow(customId, label = 'Confirm') {
  return new ActionRowBuilder().addComponents(button(customId, label, ButtonStyle.Danger));
}

module.exports = { entryActions, paginationRow, confirmRow };
