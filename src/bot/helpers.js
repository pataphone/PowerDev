const { MessageFlags } = require('discord.js');

// Ephemeral reply payload (only visible to the user, never pings anyone).
function ephemeral(content) {
  return { content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } };
}

// Reads a text input from a modal submit; returns '' if the field is missing.
function readField(interaction, id) {
  try {
    return interaction.fields.getTextInputValue(id);
  } catch {
    return '';
  }
}

// Custom IDs of all components currently attached to a message.
function componentIds(message) {
  return (message?.components ?? []).flatMap((row) =>
    (row.components ?? []).map((component) => component.customId).filter(Boolean)
  );
}

// Human-readable description of a list filter, e.g. `tags: a, b (all) · search: "x"`.
function describeFilter({ tags = [], match = 'any', search } = {}) {
  const parts = [];
  if (tags.length) parts.push(`tags: ${tags.join(', ')}${tags.length > 1 ? ` (${match})` : ''}`);
  if (search) parts.push(`search: "${search}"`);
  return parts.length ? parts.join(' · ') : 'all entries';
}

module.exports = { ephemeral, readField, componentIds, describeFilter };
