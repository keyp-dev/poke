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

```bash
# 1. Install dependencies
bun install   # or npm install

# 2. Create the D1 database, then put the returned database_id into wrangler.toml
wrangler d1 create poke-db

# 3. Initialize the schema
bun run db:migrate        # local
bun run db:migrate:prod   # production

# 4. Configure secrets (do NOT put these in wrangler.toml)
wrangler secret put BOT_TOKEN       # Telegram Bot Token
wrangler secret put BOT_OWNER_ID    # your numeric Telegram user id
# WEBHOOK_BASE_URL must also be set to your domain, e.g. https://poke.keyp.dev

# 5. Deploy
bun run deploy
```

After deploying, point the Telegram bot's webhook at your `/bot` endpoint:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://poke.keyp.dev/bot"
```

## Local Development

```bash
bun run dev          # start wrangler dev
```

Put environment variables in `.dev.vars` (already in `.gitignore`):

```
BOT_TOKEN=...
BOT_OWNER_ID=...
WEBHOOK_BASE_URL=http://localhost:8787
```

## Environment Variables

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
