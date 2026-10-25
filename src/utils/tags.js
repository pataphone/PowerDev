const config = require('../config');
const { ValidationError } = require('./errors');

// "#Dark Mode" -> "dark-mode". Only letters, digits, "_" and "-" survive.
function normalizeTag(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .slice(0, config.MAX_TAG_LENGTH);
}

// Accepts "a, b c" or ["a", "b"]. Returns unique normalized tag names.
function parseTags(input) {
  const parts = Array.isArray(input) ? input : String(input ?? '').split(/[,\s;]+/);
  const tags = [...new Set(parts.map(normalizeTag).filter(Boolean))];
  if (tags.length > config.MAX_TAGS_PER_ENTRY) {
    throw new ValidationError(`Too many tags (max ${config.MAX_TAGS_PER_ENTRY}).`);
  }
  return tags;
}

module.exports = { normalizeTag, parseTags };
