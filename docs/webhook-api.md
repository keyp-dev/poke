# Poke Webhook API

Base URL: `https://poke.keyp.dev`

## Quick Start

1. Find `@pokeup_bot` in Telegram and send `/webhook` to get a webhook URL
2. POST to that URL to push a message to Telegram

```bash
curl -X POST https://poke.keyp.dev/t/<token> \
  -H "Content-Type: application/json" \
  -d '{"event": "Hello World"}'
```

## Request Format

`POST /t/:token`

Content-Type: `application/json`

## Template Fields

The following fields are used to build a formatted message; they apply to the `text`, `photo`, and `document` types:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | string | required for text type | Event name, shown in bold |
| `channel` | string | no | Source channel, shown as a hashtag |
| `emoji` | string | no | Leading emoji |
| `metadata` | object | no | Key/value extra data |

Rendered result:

> 👋 • #WebApp
>
> **New User Registered**
>
> #email: user@example.com
> #plan: pro

## Message Types

### text (default)

Uses the template fields to build a formatted notification.

```json
{
  "event": "New User Registered",
  "channel": "WebApp",
  "emoji": "👋",
  "metadata": {
    "email": "user@example.com",
    "plan": "pro"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | string | yes | Template field (see above) |

### photo

Sends an image. `caption` takes priority; if omitted, the template fields are used to auto-generate the caption.

```json
{
  "type": "photo",
  "photo": "https://example.com/screenshot.png",
  "event": "E2E Test Failed",
  "channel": "CI",
  "emoji": "❌"
}
```

Result: the image plus a template-formatted caption below it.

You can also set `caption` directly to fully customize the text:

```json
{
  "type": "photo",
  "photo": "https://example.com/screenshot.png",
  "caption": "<b>Deploy screenshot</b>"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | `"photo"` |
| `photo` | string | yes | Image URL |
| `caption` | string | no | Custom caption. If omitted, generated from template fields |

### document

Sends a file. Same rules as photo — `caption` takes priority, otherwise template fields are used.

```json
{
  "type": "document",
  "document": "https://example.com/report.pdf",
  "event": "Weekly Report Generated",
  "channel": "Analytics",
  "emoji": "📊"
}
```

Result: the file attachment plus a template-formatted caption.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | `"document"` |
| `document` | string | yes | File URL |
| `caption` | string | no | Custom caption. If omitted, generated from template fields |

### sticker

Sends a sticker.

```json
{
  "type": "sticker",
  "sticker": "CAACAgIAAxkBAAI..."
}
```

Result: sends a Telegram sticker directly.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | `"sticker"` |
| `sticker` | string | yes | Telegram file_id or sticker URL |

### raw

Sends raw text without template formatting. Use this when you need full control over the message content.

```json
{
  "type": "raw",
  "text": "<b>Server Alert</b>\n\nCPU usage exceeded 90% on prod-1.",
  "parse_mode": "HTML"
}
```

Result:

> **Server Alert**
>
> CPU usage exceeded 90% on prod-1.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | `"raw"` |
| `text` | string | yes | Message content, supports HTML or MarkdownV2 |
| `link_preview` | boolean | no | Whether to show link previews, defaults to `true` |

## Common Optional Fields

The following fields apply to all message types:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `notify` | boolean | `true` | Whether to trigger a notification sound and popup. When `false`, the message is delivered silently (no sound, popup, or vibration) — good for non-urgent log-style messages |
| `parse_mode` | string | `"HTML"` | `"HTML"` or `"MarkdownV2"` |

## Response

Success:

```json
{ "ok": true }
```

Failure:

```json
{ "error": "error description", "detail": "..." }
```

| HTTP Status | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad request (missing required field, invalid JSON, etc.) |
| 404 | Webhook token not found |
| 502 | Telegram API call failed |

## Examples

### CI/CD Deploy Notification

```bash
curl -X POST https://poke.keyp.dev/t/<token> \
  -H "Content-Type: application/json" \
  -d '{
    "event": "Deploy Succeeded",
    "channel": "CI",
    "emoji": "🚀",
    "metadata": {
      "branch": "main",
      "commit": "'$(git rev-parse --short HEAD)'"
    }
  }'
```

### Server Monitoring Alert

```bash
curl -X POST https://poke.keyp.dev/t/<token> \
  -H "Content-Type: application/json" \
  -d '{
    "type": "raw",
    "text": "🔴 <b>ALERT</b>\n\nDisk usage on prod-db reached 95%.",
    "notify": true
  }'
```

### GitHub Actions

```yaml
- name: Notify deploy
  if: success()
  run: |
    curl -X POST ${{ secrets.POKE_WEBHOOK_URL }} \
      -H "Content-Type: application/json" \
      -d '{"event":"Deploy ${{ github.ref_name }}","channel":"GitHub","emoji":"✅"}'
```

### Sending a Screenshot

```bash
curl -X POST https://poke.keyp.dev/t/<token> \
  -H "Content-Type: application/json" \
  -d '{
    "type": "photo",
    "photo": "https://example.com/screenshot.png",
    "caption": "<b>E2E Test Failed</b>\nSee attached screenshot."
  }'
```
