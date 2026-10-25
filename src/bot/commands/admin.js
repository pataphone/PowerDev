const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const entries = require('../../db/entries');
const tagStore = require('../../db/tags');
const users = require('../../db/users');
const permissions = require('../../permissions');
const { ROLES, DEFAULT_ROLE } = require('../../permissions/roles');
const { parseTags } = require('../../utils/tags');
const { ValidationError } = require('../../utils/errors');
const { createSession } = require('../sessions');
const { confirmRow } = require('../ui/buttons');
const { ephemeral, describeFilter } = require('../helpers');

// /admin: management tools. Each subcommand declares the permission it needs (see `handlers`).
//   /admin role set|clear|list     who can do what
//   /admin tag rename|delete       rename (merges if the target exists) or remove a tag everywhere
//   /admin bulk retag|delete       change many entries at once, selected by a filter

function addFilterOptions(subcommand) {
  return subcommand
    .addStringOption((option) => option.setName('tags').setDescription('Only entries with these tags'))
    .addStringOption((option) =>
      option
        .setName('match')
        .setDescription('any = at least one tag, all = every tag')
        .addChoices({ name: 'any', value: 'any' }, { name: 'all', value: 'all' })
    )
    .addStringOption((option) => option.setName('search').setDescription('Only entries containing this text'));
}

function readFilter(interaction) {
  return {
    tags: parseTags(interaction.options.getString('tags')),
    match: interaction.options.getString('match') ?? 'any',
    search: interaction.options.getString('search') ?? undefined,
  };
}

// --- role ---------------------------------------------------------------------

async function roleSet(interaction) {
  const user = interaction.options.getUser('user', true);
  const roleId = interaction.options.getString('role', true);
  if (!ROLES[roleId]) throw new ValidationError('Unknown role.');
  if (config.OWNER_IDS.includes(user.id)) {
    throw new ValidationError('Owners are always admins and cannot be changed here.');
  }

  if (roleId === DEFAULT_ROLE) users.clearRole(user.id);
  else users.setRole(user.id, roleId);
  await interaction.reply(ephemeral(`${user} is now **${ROLES[roleId].label}**.`));
}

async function roleClear(interaction) {
  const user = interaction.options.getUser('user', true);
  users.clearRole(user.id);
  await interaction.reply(ephemeral(`${user} is back to the default role (**${ROLES[DEFAULT_ROLE].label}**).`));
}

async function roleList(interaction) {
  const lines = [];
  for (const id of config.OWNER_IDS) lines.push(`<@${id}> — **Admin** (owner)`);
  for (const { discordId, role } of users.listAssignments()) {
    lines.push(`<@${discordId}> — **${ROLES[role]?.label ?? `${role} (undefined)`}**`);
  }
  const intro = `Everyone else is **${ROLES[DEFAULT_ROLE].label}**.`;
  await interaction.reply(ephemeral([...lines, intro].join('\n')));
}

// --- tag ----------------------------------------------------------------------

async function tagRename(interaction) {
  const result = tagStore.renameTag(
    interaction.options.getString('from', true),
    interaction.options.getString('to', true)
  );
  const how = result.merged ? 'merged into the existing tag' : 'renamed';
  await interaction.reply(ephemeral(`Tag ${how}. ${result.affected} entries affected.`));
}

async function tagDelete(interaction) {
  const result = tagStore.deleteTag(interaction.options.getString('name', true));
  await interaction.reply(ephemeral(`Tag removed from ${result.affected} entries (the entries were kept).`));
}

// --- bulk ---------------------------------------------------------------------

async function bulkRetag(interaction) {
  const filter = readFilter(interaction);
  const count = entries.bulkRetag(filter, {
    add: parseTags(interaction.options.getString('add')),
    remove: parseTags(interaction.options.getString('remove')),
  });
  await interaction.reply(ephemeral(`Updated ${count} entries (${describeFilter(filter)}).`));
}

async function bulkDelete(interaction) {
  const filter = readFilter(interaction);
  if (!entries.hasFilter(filter)) throw new ValidationError('Provide at least a tag filter or search text.');

  const count = entries.countEntries(filter);
  if (!count) return interaction.reply(ephemeral('No entries match that filter.'));

  const sessionId = createSession({ ownerId: interaction.user.id, filter });
  await interaction.reply({
    ...ephemeral(`Permanently delete **${count}** entries (${describeFilter(filter)})? This cannot be undone.`),
    components: [confirmRow(`admin:bulk_delete:${sessionId}`, `Delete ${count} entries`)],
  });
}

const handlers = {
  'role set': { permission: 'role.manage', run: roleSet },
  'role clear': { permission: 'role.manage', run: roleClear },
  'role list': { permission: 'role.manage', run: roleList },
  'tag rename': { permission: 'tag.manage', run: tagRename },
  'tag delete': { permission: 'tag.manage', run: tagDelete },
  'bulk retag': { permission: 'entry.bulk', run: bulkRetag },
  'bulk delete': { permission: 'entry.bulk', run: bulkDelete },
};

const roleChoices = Object.entries(ROLES).map(([id, role]) => ({ name: role.label, value: id }));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Administration tools')
    .addSubcommandGroup((group) =>
      group
        .setName('role')
        .setDescription('Manage user roles')
        .addSubcommand((sub) =>
          sub
            .setName('set')
            .setDescription('Assign a role to a user')
            .addUserOption((option) => option.setName('user').setDescription('The user').setRequired(true))
            .addStringOption((option) =>
              option.setName('role').setDescription('Role to assign').setRequired(true).addChoices(...roleChoices)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('clear')
            .setDescription('Reset a user to the default role')
            .addUserOption((option) => option.setName('user').setDescription('The user').setRequired(true))
        )
        .addSubcommand((sub) => sub.setName('list').setDescription('Show users with special roles'))
    )
    .addSubcommandGroup((group) =>
      group
        .setName('tag')
        .setDescription('Manage tags')
        .addSubcommand((sub) =>
          sub
            .setName('rename')
            .setDescription('Rename a tag (merges if the new name already exists)')
            .addStringOption((option) => option.setName('from').setDescription('Current tag').setRequired(true))
            .addStringOption((option) => option.setName('to').setDescription('New tag').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('delete')
            .setDescription('Remove a tag from all entries')
            .addStringOption((option) => option.setName('name').setDescription('Tag to remove').setRequired(true))
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('bulk')
        .setDescription('Change many entries at once')
        .addSubcommand((sub) =>
          addFilterOptions(
            sub.setName('retag').setDescription('Add/remove tags on all entries matching a filter')
          )
            .addStringOption((option) => option.setName('add').setDescription('Tags to add'))
            .addStringOption((option) => option.setName('remove').setDescription('Tags to remove'))
        )
        .addSubcommand((sub) =>
          addFilterOptions(sub.setName('delete').setDescription('Delete all entries matching a filter'))
        )
    ),

  async execute(interaction) {
    const key = `${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}`;
    const handler = handlers[key];
    if (!handler) return;

    permissions.assertCan(interaction.user.id, handler.permission);
    await handler.run(interaction);
  },
};
