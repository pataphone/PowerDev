const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const entries = require('../../db/entries');
const permissions = require('../../permissions');
const { parseTags } = require('../../utils/tags');
const { importanceChoices } = require('../../utils/importance');
const { entryEmbed } = require('../ui/embeds');
const { entryActions } = require('../ui/buttons');

// /add: the fastest way to save something.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Quickly save an entry')
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription('What to save')
        .setRequired(true)
        .setMaxLength(config.MAX_ENTRY_TEXT)
    )
    .addStringOption((option) =>
      option.setName('tags').setDescription('Tags, comma or space separated')
    )
    .addIntegerOption((option) =>
      option
        .setName('importance')
        .setDescription('How important is it? (default: normal)')
        .addChoices(...importanceChoices())
    ),

  async execute(interaction) {
    const user = interaction.user;
    permissions.assertCan(user.id, 'entry.create');

    const entry = entries.createEntry({
      text: interaction.options.getString('text', true),
      tags: parseTags(interaction.options.getString('tags')),
      importance: interaction.options.getInteger('importance'),
      authorId: user.id,
      authorName: user.username,
    });

    await interaction.reply({
      content: `Saved as #${entry.id}`,
      embeds: [entryEmbed(entry)],
      components: entryActions(entry, user.id, { addMore: true }),
    });
  },
};
