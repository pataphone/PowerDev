const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('../../config');
const { getImportance } = require('../../utils/importance');

// All Discord modal construction lives here, so API changes only touch this file.

function row({ id, label, style = 'short', required = false, maxLength, placeholder, value }) {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
    .setRequired(required);
  if (maxLength) input.setMaxLength(maxLength);
  if (placeholder) input.setPlaceholder(placeholder);
  if (value) input.setValue(String(value).slice(0, maxLength || 4000));
  return new ActionRowBuilder().addComponents(input);
}

function build({ customId, title, fields }) {
  return new ModalBuilder().setCustomId(customId).setTitle(title).addComponents(fields.map(row));
}

// A modal for a form from forms.js. `defaults` maps field id -> prefilled value.
function formModal(form, { customId, defaults = {} }) {
  return build({
    customId,
    title: form.title,
    fields: form.fields.map((field) => ({ ...field, value: defaults[field.id] })),
  });
}

function editEntryModal(entry) {
  return build({
    customId: `entry:edit:${entry.id}`,
    title: `Edit entry #${entry.id}`,
    fields: [
      { id: 'text', label: 'Text', style: 'paragraph', required: true, maxLength: config.MAX_ENTRY_TEXT, value: entry.text },
      {
        id: 'importance',
        label: 'Importance (low / normal / high)',
        maxLength: 6,
        value: getImportance(entry.importance).label.toLowerCase(),
      },
    ],
  });
}

function editTagsModal(entry) {
  return build({
    customId: `entry:tags:${entry.id}`,
    title: `Edit tags of #${entry.id}`,
    fields: [
      {
        id: 'tags',
        label: 'Tags (comma or space separated)',
        maxLength: 400,
        placeholder: 'Leave empty to remove all tags',
        value: entry.tags.join(', '),
      },
    ],
  });
}

function commentModal(entry) {
  return build({
    customId: `entry:comment:${entry.id}`,
    title: `Comment on #${entry.id}`,
    fields: [
      { id: 'text', label: 'Comment', style: 'paragraph', required: true, maxLength: config.MAX_COMMENT_TEXT },
    ],
  });
}

module.exports = { formModal, editEntryModal, editTagsModal, commentModal };
