const { EmbedBuilder } = require('discord.js');
const entries = require('../../db/entries');
const comments = require('../../db/comments');
const { entryEmbed } = require('./embeds');
const { entryActions, paginationRow } = require('./buttons');
const { renderTable } = require('./table');
const { describeFilter } = require('../helpers');
const { getImportance } = require('../../utils/importance');

// "table" shows many entries per page, "cards" shows one entry per page with action buttons.
const PAGE_SIZE = { table: 10, cards: 1 };

// Builds the message payload for one page of a list session.
// session = { ownerId, tags, match, search, view }
function renderListPage(session, sessionId, requestedPage = 0) {
  const filter = { tags: session.tags, match: session.match, search: session.search };
  const pageSize = PAGE_SIZE[session.view] || PAGE_SIZE.table;

  const total = entries.countEntries(filter);
  if (!total) return { content: 'No entries found.', embeds: [], components: [] };

  const pages = Math.ceil(total / pageSize);
  const page = Math.min(Math.max(Number(requestedPage) || 0, 0), pages - 1);
  const { entries: pageEntries } = entries.listEntries({ ...filter, limit: pageSize, offset: page * pageSize });

  const footer = `Page ${page + 1}/${pages} · ${total} entries · ${describeFilter(filter)}`;
  const components = [];
  let embed;

  if (session.view === 'cards') {
    const entry = pageEntries[0];
    embed = entryEmbed(entry, { comments: comments.listComments(entry.id), footer });
    components.push(...entryActions(entry, session.ownerId));
  } else {
    // The side color follows the most important entry on the page.
    const top = Math.max(...pageEntries.map((entry) => entry.importance));
    embed = new EmbedBuilder()
      .setColor(getImportance(top).color)
      .setTitle('Entries')
      .setDescription(renderTable(pageEntries))
      .setFooter({ text: footer });
  }

  if (pages > 1) components.push(paginationRow(sessionId, page, pages));
  return { content: null, embeds: [embed], components };
}

module.exports = { renderListPage };
