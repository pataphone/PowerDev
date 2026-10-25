# ideas-bot

A small Discord bot plus HTTP API for collecting ideas, bug reports and notes in one place.
Entries have text, **tags** (several per entry), an **importance** level, an author and comments.
Everything runs in **one Node.js process** with a single SQLite file.

## Quick start

1. Install a current Node.js LTS (22+), then `npm install`.
2. Copy `.env.example` to `.env` and fill it in (see below).
3. `npm run register`: registers the slash commands (repeat whenever commands, roles, forms or importance levels change).
4. `npm start`: starts the bot and (if `API_KEY` is set) the API.
5. In Discord: `/add text:My first idea tags:game importance:High`

### Discord setup

- Developer Portal -> your application -> **Bot** -> Reset Token -> `DISCORD_TOKEN`.
- **General Information** -> Application ID -> `APP_ID`.
- Leave **Interactions Endpoint URL empty** (the bot connects through the gateway, no public URL needed).
- No privileged intents are required.
- Invite the bot: OAuth2 -> URL Generator -> scopes `bot` and `applications.commands`.
- `GUILD_ID`: enable Developer Mode in Discord, right-click your server -> Copy Server ID.
- `OWNER_IDS`: your own user ID (right-click yourself -> Copy User ID). **Owners are always admins.** Without it nobody is an admin.

## Commands

| Command | Who | What it does |
| --- | --- | --- |
| `/add text [tags] [importance]` | everyone | Save something fast. Tags are comma or space separated. |
| `/submit type` | everyone | Opens a form (idea / bug report / report / other). |
| `/list [tags] [match] [view] [search]` | everyone | Browse. `view:table` = compact overview, `view:cards` = one entry per page with action buttons. `match:all` requires every tag. |
| `/view id` | everyone | One entry with its comments. |
| `/tags` | everyone | All tags with counts. |
| `/admin role set\|clear\|list` | `role.manage` | Assign roles to users. |
| `/admin tag rename\|delete` | `tag.manage` | Rename (merges into an existing tag) or remove a tag everywhere. |
| `/admin bulk retag\|delete` | `entry.bulk` | Change/delete all entries matching a filter. |

Buttons under entries: **Add more**, **Edit**, **Edit tags**, **Comment**, **Delete**.
Users can use them on their own entries; admins on any entry. Permissions are checked again on every click.

## Roles and permissions

Roles are plain objects in [`src/permissions/roles.js`](src/permissions/roles.js): a label and a list of permissions.
Default role for everyone not listed: `user`. Built in: `banned` (can do nothing), `user`, `moderator`, `admin`.
To add a role, add an object there, run `npm run register`, then `/admin role set`.

## HTTP API

Set `API_KEY` and send it in the `X-API-Key` header. Interactive clients can use any language:

```bash
curl -H "X-API-Key: $KEY" "https://your-app.onrender.com/entries?tags=game,ui&match=all&limit=10"
curl -X POST https://your-app.onrender.com/entries -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"text":"cat detective game","tags":["game","idea"],"importance":"high","author":"me"}'
```

| Route | Description |
| --- | --- |
| `GET /health` | No auth. Returns `{"ok":true}`. |
| `GET /entries?tags=&match=any\|all&q=&limit=&offset=` | List (newest first). Total count is in the `X-Total-Count` header. `category` still works as an alias of `tags`. |
| `POST /entries` | `{ text, tags?, importance?, author? }` |
| `GET /entries/:id` | Entry with its comments. |
| `PATCH /entries/:id` | `{ text?, importance?, tags? }` (`tags` replaces all tags). |
| `DELETE /entries/:id` | |
| `POST /entries/:id/comments` | `{ text, author? }` |
| `GET /tags` | Tags with counts. |

Entry shape: `{ id, text, importance (1-3), tags, authorId, authorName, createdAt, updatedAt }`.

## Upgrading from the old schema

On first start the database is upgraded automatically (`src/db/migrations.js`):
old categories become tags (`"long term"` -> `long-term`), all entries keep their IDs, and a copy of the old file is saved as `<DB_PATH>.pre-migration.bak`.

## Hosting notes (Render)

- Start command `npm start`, set the environment variables from `.env.example`.
- The free tier has an **ephemeral disk**: `ideas.db` is wiped on every redeploy/restart. Use a persistent disk and set `DB_PATH` to it, or move the data to an external database.
- Free services sleep when idle, which disconnects the bot; a periodic ping to `/health` keeps it awake.

## Project layout

```
index.js                  starts API + bot
register-commands.js      registers slash commands (built from src/bot/commands)
src/
  config.js               env vars, limits, importance levels
  db/                     SQLite: connection, migrations, entries, tags, comments, users
  permissions/            roles.js (role objects) and permission checks
  api/server.js           Express routes
  bot/
    commands/             one file per slash command (data + execute)
    components/           button and modal handlers, routed by custom ID prefix
    events/               Discord events (ready, interactionCreate)
    ui/                   embeds, buttons, modals, table, list pages
    forms.js              /submit forms as plain data
  utils/                  tags, importance, text helpers, error classes
test/                     node:test suites (npm test)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to extend it.
