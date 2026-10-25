const entries = require('../../db/entries');
const permissions = require('../../permissions');
const { NotFoundError } = require('../../utils/errors');
const { FORMS, buildEntryInput } = require('../forms');
const { entryEmbed } = require('../ui/embeds');
const { entryActions } = require('../ui/buttons');
const { readField } = require('../helpers');

// Submitted forms from /submit and the "Add more" button.   Custom ID: submit:<formId>
module.exports = {
  id: 'submit',

  async modal(interaction, [formId]) {
    const form = FORMS[formId];
    if (!form) throw new NotFoundError('This form no longer exists.');

    const user = interaction.user;
    permissions.assertCan(user.id, 'entry.create');

    const values = Object.fromEntries(form.fields.map((field) => [field.id, readField(interaction, field.id)]));
    const entry = entries.createEntry({
      ...buildEntryInput(form, values),
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
