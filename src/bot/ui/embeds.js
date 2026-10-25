const { EmbedBuilder } = require('discord.js');
const { getImportance } = require('../../utils/importance');
const { truncate, oneLine, parseDbDate } = require('../../utils/text');

// One entry as a card. The side color follows the importance level.
function entryEmbed(entry, { comments = [], footer } = {}) {
  const level = getImportance(entry.importance);
  const embed = new EmbedBuilder()
    .setColor(level.color)
    .setTitle(`#${entry.id}`)
    .setDescription(truncate(entry.text, 4000))
    .addFields(
      {
        name: 'Tags',
        value: entry.tags.length ? entry.tags.map((tag) => `\`${tag}\``).join(' ') : '—',
        inline: true,
      },
      { name: 'Importance', value: level.label, inline: true },
      { name: 'Author', value: truncate(entry.authorName || 'unknown', 100), inline: true }
    )
    .setTimestamp(parseDbDate(entry.createdAt));

  if (comments.length) {
    const lines = comments.map(
      (comment) => `**${comment.authorName || 'unknown'}:** ${truncate(oneLine(comment.text), 150)}`
    );
    embed.addFields({ name: 'Comments', value: truncate(lines.join('\n'), 1024) });
  }
  if (footer) embed.setFooter({ text: footer });
  return embed;
}

module.exports = { entryEmbed };
