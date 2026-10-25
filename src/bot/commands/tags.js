const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const permissions = require('../../permissions');
const tagStore = require('../../db/tags');
const { truncate } = require('../../utils/text');

// /tags: all tags in use with their entry counts.
module.exports = {
  data: new SlashCommandBuilder().setName('tags').setDescription('Show all tags in use'),

  async execute(interaction) {
    permissions.assertCan(interaction.user.id, 'entry.view');

    const tags = tagStore.listTags();
    if (!tags.length) return interaction.reply('No tags yet.');

    const lines = tags.map((tag) => `\`${tag.name}\` × ${tag.count}`);
    const embed = new EmbedBuilder()
      .setTitle(`Tags (${tags.length})`)
      .setDescription(truncate(lines.join('  ·  '), 4000));
    await interaction.reply({ embeds: [embed] });
  },
};
