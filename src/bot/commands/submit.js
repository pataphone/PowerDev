const { SlashCommandBuilder } = require('discord.js');
const permissions = require('../../permissions');
const { FORMS, publicForms } = require('../forms');
const modals = require('../ui/modals');

// /submit <type>: opens a form (modal). The submitted modal is handled in components/submit.js.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Fill in a form (idea, bug report, ...)')
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('Which form to open')
        .setRequired(true)
        .addChoices(...publicForms().map((form) => ({ name: form.label, value: form.id })))
    ),

  async execute(interaction) {
    permissions.assertCan(interaction.user.id, 'entry.create');

    const form = FORMS[interaction.options.getString('type', true)];
    await interaction.showModal(modals.formModal(form, { customId: `submit:${interaction.options.getString('type')}` }));
  },
};
