# Poke

A Telegram webhook notification bot running on Cloudflare Workers. POST a JSON payload to it and it forwards a formatted message to your Telegram private chat, group, or group topic.

Good for: CI/CD deploy notifications, server monitoring alerts, cron job results, or any programmatic event push.

## Features

- **One URL per target** — send `/webhook` in Telegram to generate a dedicated push URL; messages go to that chat/topic
- **Templated messages** — `event` / `channel` / `emoji` / `metadata` are auto-formatted into a clean notification
- **Multiple message types** — text, photo, document, sticker, plus a `raw` type that bypasses templating
- **Silent delivery** — `notify: false` delivers log-style messages without a sound or popup
- **HTML / MarkdownV2** — pick your parse mode
- **Serverless** — Cloudflare Workers + D1; zero ops, free tier is plenty for personal use

## Stack

| Component | Purpose |
|-----------|---------|
| [Hono](https://hono.dev) | HTTP routing |
| [grammY](https://grammy.dev) | Telegram Bot framework |
| Cloudflare Workers | Runtime |
| Cloudflare D1 | Stores the webhook token → chat target mapping |

## Quick Start (users)

1. Find the bot in Telegram (e.g. `@pokeup_bot`) and send `/webhook`
2. Copy the returned URL and POST JSON to it:

```bash
curl -X POST https://poke.keyp.dev/t/<token> \
  -H "Content-Type: application/json" \
  -d '{"event": "Hello World", "emoji": "👋"}'
```

Full fields and message types are in [`docs/webhook-api.md`](docs/webhook-api.md), or view the live docs page at <https://poke.keyp.dev/docs>.

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Usage help |
| `/webhook` | Create a webhook URL for the current chat/topic |
| `/list` | List webhooks you created in the current chat (owner only) |
| `/delete <token>` | Delete a webhook (owner only) |

Works in private chats, groups, and group topics — whichever topic you send `/webhook` in is where messages land.

## Deploy (self-hosting)

Prerequisites: a Cloudflare account and a Telegram Bot Token (get one from [@BotFather](https://t.me/BotFather)).

The repo intentionally contains **no account-specific ids**. `account_id` and
`database_id` come from a local `.env` (git-ignored); `wrangler.toml` is generated
from `wrangler.toml.tmpl` by the `gen` script, which every `dev`/`deploy`/`db:migrate`
command runs first. When forking, also replace the `poke.keyp.dev` route in
`wrangler.toml.tmpl` with your own domain.

```bash
# 1. Install dependencies
bun install   # or npm install

# 2. Set up your account ids (direnv loads .env automatically on cd)
cp .env.example .env
# edit .env: CLOUDFLARE_ACCOUNT_ID (from `wrangler whoami`) — leave D1_DATABASE_ID for now
direnv allow          # or: source .env / export the vars manually

# 3. Create the D1 database, then put the returned database_id into .env
wrangler d1 create poke-db
# edit .env: D1_DATABASE_ID=<the id printed above>

# 4. Initialize the schema
bun run db:migrate        # local
bun run db:migrate:prod   # production

# 5. Configure secrets (stored in Cloudflare, never in the repo)
wrangler secret put BOT_TOKEN         # Telegram Bot Token
wrangler secret put BOT_OWNER_ID      # your numeric Telegram user id
wrangler secret put WEBHOOK_BASE_URL  # e.g. https://poke.keyp.dev

# 6. Deploy
bun run deploy
```

After deploying, point the Telegram bot's webhook at your `/bot` endpoint:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://poke.keyp.dev/bot"
```

## Local Development

```bash
bun run dev          # regenerates wrangler.toml, then starts wrangler dev
```

Worker runtime variables go in `.dev.vars` (git-ignored):

```
BOT_TOKEN=...
BOT_OWNER_ID=...
WEBHOOK_BASE_URL=http://localhost:8787
```

## Environment Variables

Account ids used by wrangler / the `gen` script, kept in `.env` (git-ignored, see `.env.example`):

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account to deploy to; read natively by wrangler |
| `D1_DATABASE_ID` | D1 database id, injected into `wrangler.toml` by the `gen` script |

Worker runtime variables, set as Cloudflare secrets in production (and in `.dev.vars` locally):

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | Telegram Bot Token |
| `BOT_OWNER_ID` | Owner's numeric Telegram user id; `/list` and `/delete` are restricted to this id |
| `WEBHOOK_BASE_URL` | Base URL used when generating webhook URLs |

## Routes

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/bot` | Receives Telegram updates (bot commands) |
| `POST` | `/t/:token` | Receives events and pushes to Telegram |
| `GET` | `/docs` | Online API documentation |

## License

Private project, for personal use only.
