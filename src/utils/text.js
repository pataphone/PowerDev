function truncate(text, max) {
  const value = String(text ?? '');
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function oneLine(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

// SQLite's datetime('now') yields "YYYY-MM-DD HH:MM:SS" in UTC.
function parseDbDate(value) {
  return new Date(`${String(value).replace(' ', 'T')}Z`);
}

module.exports = { truncate, oneLine, parseDbDate };
