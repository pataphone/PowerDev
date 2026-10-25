const { Events, MessageFlags } = require('discord.js');
const { UserError } = require('../../utils/errors');

// Single entry point for all interactions:
//   slash commands  -> client.commands (by command name)
//   buttons/modals  -> client.components (by the first part of the custom ID)
async function reportError(interaction, error) {
  const isUserError = error instanceof UserError;
  if (!isUserError) console.error(error);
  const content = isUserError ? error.message : 'Something went wrong. Please try again later.';

  try {
    if (interaction.replied) await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    else if (interaction.deferred) await interaction.editReply({ content, embeds: [], components: [] });
    else await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  } catch (replyError) {
    console.error('Failed to report an error to the user:', replyError);
  }
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (command) await command.execute(interaction);
      } else if (interaction.isButton() || interaction.isModalSubmit()) {
        const [prefix, ...args] = interaction.customId.split(':');
        const component = interaction.client.components.get(prefix);
        const handler = interaction.isButton() ? component?.button : component?.modal;
        if (handler) await handler(interaction, args);
      }
    } catch (error) {
      await reportError(interaction, error);
    }
  },
};
