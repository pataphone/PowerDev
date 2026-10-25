const { IMPORTANCE, DEFAULT_IMPORTANCE } = require('../config');
const { ValidationError } = require('./errors');

const levelByName = new Map(
  Object.entries(IMPORTANCE).map(([level, { label }]) => [label.toLowerCase(), Number(level)])
);

function getImportance(level) {
  return IMPORTANCE[level] || IMPORTANCE[DEFAULT_IMPORTANCE];
}

// Accepts a level number, a name ("low", "normal", "high") or nothing (-> default).
function parseImportance(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return DEFAULT_IMPORTANCE;
  }
  const text = String(value).trim().toLowerCase();
  if (levelByName.has(text)) return levelByName.get(text);
  const level = Number(text);
  if (Number.isInteger(level) && IMPORTANCE[level]) return level;
  throw new ValidationError(`Importance must be one of: ${[...levelByName.keys()].join(', ')}.`);
}

// Choices for slash command options.
function importanceChoices() {
  return Object.entries(IMPORTANCE).map(([level, { label }]) => ({
    name: label,
    value: Number(level),
  }));
}

module.exports = { getImportance, parseImportance, importanceChoices };
