const fs = require('node:fs');
const path = require('node:path');

// Requires every .js file in a directory (non-recursive) and returns the exports.
function loadModules(dir) {
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => require(path.join(dir, file)));
}

module.exports = { loadModules };
