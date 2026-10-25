# Contributing

Thanks for helping! The project is intentionally small. A few conventions keep it easy to extend.

- Code, comments and docs are written in **English**.
- CommonJS (`require`), 2-space indent (see `.editorconfig`), no build step.
- Run `npm test` before opening a pull request. Tests use an in-memory database.
- Never commit `.env` or `*.db`.

## Where things live

Keep Discord-specific code in `src/bot`, and database access in `src/db`. The bot and the API both call the
`src/db` functions directly, so a new feature usually needs: a db function, a Discord command and/or an API route, and a test.

## Add a slash command

1. Create `src/bot/commands/<name>.js` exporting `{ data, execute }` (copy `view.js` as a template).
2. Check permissions with `permissions.assertCan(interaction.user.id, '<permission>')`.
3. Throw `ValidationError` / `NotFoundError` / `PermissionError` (from `src/utils/errors.js`) for user-facing errors; they are shown to the user automatically.
4. Run `npm run register`. Nothing else needs editing: commands are loaded from the folder.

## Add buttons or modals

Custom IDs look like `<handler>:<action>:<args>`. The first part selects a file in `src/bot/components`
(its `id` field), which exports `button(interaction, args)` and/or `modal(interaction, args)`.
Build Discord UI objects in `src/bot/ui` so handlers stay short. Custom IDs are limited to 100 characters:
keep bulky state in `src/bot/sessions.js`.

## Add a /submit form

Add an object to `FORMS` in `src/bot/forms.js` (field definitions are plain data, max 5 per modal), then `npm run register`.
Form fields are merged into the single `text` column of an entry, with bold labels as separators.
This is deliberate: the text is only ever displayed and searched as a whole. If a field ever needs to be queried
on its own (for example "all bugs with severity X"), add a column in a new migration instead.

## Add a role or permission

Roles are objects in `src/permissions/roles.js`. A new permission is just a new string: use it in a command or
component with `assertCan`, and list it in the roles that should have it.

## Change the database

Append a function to the `migrations` array in `src/db/migrations.js`. Never edit an existing migration:
databases that already ran it will not run it again. Add a test in `test/db.test.js`.

## Add an API route

Add it in `src/api/server.js`. Throw the same error classes; they map to 400/404/403. Document it in the README table.

## Importance levels

Defined in `src/config.js` (`IMPORTANCE`). Importance is a real column (not a tag) because it is sorted, colored
and validated; adding a level there updates commands, forms and embed colors automatically.
