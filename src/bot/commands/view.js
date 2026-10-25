const { SlashCommandBuilder } = require('discord.js');
const entries = require('../../db/entries');
const comments = require('../../db/comments');
const permissions = require('../../permissions');
const { entryEmbed } = require('../ui/embeds');
const { entryActions } = require('../ui/buttons');

// /view: show one entry with its comments and the actions you are allowed to use.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('view')
    .setDescription('Show one entry')
    .addIntegerOption((option) =>
      option.setName('id').setDescription('Entry number').setRequired(true).setMinValue(1)
    ),

  async execute(interaction) {
    permissions.assertCan(interaction.user.id, 'entry.view');

    const entry = entries.requireEntry(interaction.options.getInteger('id', true));
    await interaction.reply({
      embeds: [entryEmbed(entry, { comments: comments.listComments(entry.id) })],
      components: entryActions(entry, interaction.user.id),
    });
  },
};
