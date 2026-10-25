const { SlashCommandBuilder } = require('discord.js');
const permissions = require('../../permissions');
const { parseTags } = require('../../utils/tags');
const { createSession } = require('../sessions');
const { renderListPage } = require('../ui/listView');

// /list: browse entries. "table" = compact overview, "cards" = one entry per page with actions.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('Browse saved entries')
    .addStringOption((option) =>
      option.setName('tags').setDescription('Only entries with these tags (comma or space separated)')
    )
    .addStringOption((option) =>
      option
        .setName('match')
        .setDescription('With several tags: entries having ANY of them or ALL of them')
        .addChoices({ name: 'any', value: 'any' }, { name: 'all', value: 'all' })
    )
    .addStringOption((option) =>
      option
        .setName('view')
        .setDescription('How to display the results (default: table)')
        .addChoices({ name: 'table', value: 'table' }, { name: 'cards', value: 'cards' })
    )
    .addStringOption((option) =>
      option.setName('search').setDescription('Only entries containing this text')
    ),

  async execute(interaction) {
    permissions.assertCan(interaction.user.id, 'entry.view');

    const session = {
      ownerId: interaction.user.id,
      tags: parseTags(interaction.options.getString('tags')),
      match: interaction.options.getString('match') ?? 'any',
      view: interaction.options.getString('view') ?? 'table',
      search: interaction.options.getString('search') ?? undefined,
    };
    const sessionId = createSession(session);

    await interaction.reply(renderListPage(session, sessionId, 0));
  },
};
