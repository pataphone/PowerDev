const { getImportance } = require('../../utils/importance');
const { truncate, oneLine } = require('../../utils/text');

// Monospace "table" in a code block, good for scanning many entries at once.
function renderTable(entries) {
  const header = ['ID', 'Imp', 'Tags', 'Text'];
  const rows = entries.map((entry) => [
    `#${entry.id}`,
    getImportance(entry.importance).label,
    truncate(entry.tags.join(','), 18) || '-',
    truncate(oneLine(entry.text), 36),
  ]);

  const widths = header.map((title, i) => Math.max(title.length, ...rows.map((row) => row[i].length)));
  const format = (cells) =>
    cells
      .map((cell, i) => cell.padEnd(widths[i]))
      .join(' | ')
      .trimEnd();

  const lines = [
    format(header),
    widths.map((width) => '-'.repeat(width)).join('-+-'),
    ...rows.map(format),
  ];
  // Backticks inside the content would break out of the code block.
  return `\`\`\`\n${lines.join('\n').replace(/`/g, "'")}\n\`\`\``;
}

module.exports = { renderTable };
