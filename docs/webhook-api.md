# Poke Webhook API

Base URL: `https://poke.keyp.dev`

## Quick Start

1. 在 Telegram 中找到 `@pokeup_bot`，发送 `/webhook` 获取 webhook URL
2. 向该 URL 发送 POST 请求即可推送消息到 Telegram

```bash
curl -X POST https://poke.keyp.dev/t/<token> \
  -H "Content-Type: application/json" \
  -d '{"event": "Hello World"}'
```

## 请求格式

`POST /t/:token`

Content-Type: `application/json`

## 模板字段

以下字段用于生成格式化消息，适用于 `text`、`photo`、`document` 类型：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `event` | string | text 类型必填 | 事件名称，加粗显示 |
| `channel` | string | 否 | 来源渠道，显示为 hashtag |
| `emoji` | string | 否 | 前缀 emoji |
| `metadata` | object | 否 | 键值对附加数据 |

生成效果：

> 👋 • #WebApp
>
> **New User Registered**
>
> #email: user@example.com
> #plan: pro

## 消息类型

### text（默认）

使用模板字段生成格式化通知消息。

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

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `event` | string | 是 | 模板字段（见上方） |

### photo

发送图片消息。`caption` 优先；省略 `caption` 时使用模板字段自动生成说明。

```json
{
  "type": "photo",
  "photo": "https://example.com/screenshot.png",
  "event": "E2E Test Failed",
  "channel": "CI",
  "emoji": "❌"
}
```

效果：图片 + 下方显示模板格式化的说明文字。

也可以直接指定 `caption` 来完全自定义说明：

```json
{
  "type": "photo",
  "photo": "https://example.com/screenshot.png",
  "caption": "<b>部署截图</b>"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | `"photo"` |
| `photo` | string | 是 | 图片 URL |
| `caption` | string | 否 | 自定义说明。省略则使用模板字段生成 |

### document

发送文件。规则同 photo，`caption` 优先，否则使用模板字段。

```json
{
  "type": "document",
  "document": "https://example.com/report.pdf",
  "event": "Weekly Report Generated",
  "channel": "Analytics",
  "emoji": "📊"
}
```

效果：文件附件 + 模板格式化的说明文字。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | `"document"` |
| `document` | string | 是 | 文件 URL |
| `caption` | string | 否 | 自定义说明。省略则使用模板字段生成 |

### sticker

发送贴纸。

```json
{
  "type": "sticker",
  "sticker": "CAACAgIAAxkBAAI..."
}
```

效果：直接发送一个 Telegram 贴纸。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | `"sticker"` |
| `sticker` | string | 是 | Telegram file_id 或贴纸 URL |

### raw

直接发送原始文本，不走模板格式化。适合需要完全自定义消息内容的场景。

```json
{
  "type": "raw",
  "text": "<b>Server Alert</b>\n\nCPU usage exceeded 90% on prod-1.",
  "parse_mode": "HTML"
}
```

效果：

> **Server Alert**
>
> CPU usage exceeded 90% on prod-1.

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | `"raw"` |
| `text` | string | 是 | 消息内容，支持 HTML 或 MarkdownV2 |
| `link_preview` | boolean | 否 | 是否显示链接预览，默认 `true` |

## 通用可选字段

以下字段适用于所有消息类型：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `notify` | boolean | `true` | 是否触发通知音和弹窗。`false` 时消息静音送达（不响铃、不弹窗、不震动），适合非紧急的日志类消息 |
| `parse_mode` | string | `"HTML"` | `"HTML"` 或 `"MarkdownV2"` |

## 响应

成功：

```json
{ "ok": true }
```

失败：

```json
{ "error": "错误描述", "detail": "..." }
```

| HTTP 状态码 | 说明 |
|------------|------|
| 200 | 成功 |
| 400 | 请求格式错误（缺少必填字段、JSON 无效等） |
| 404 | Webhook token 不存在 |
| 502 | Telegram API 调用失败 |

## 使用示例

### CI/CD 部署通知

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

### 服务器监控告警

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

### 发送截图

```bash
curl -X POST https://poke.keyp.dev/t/<token> \
  -H "Content-Type: application/json" \
  -d '{
    "type": "photo",
    "photo": "https://example.com/screenshot.png",
    "caption": "<b>E2E Test Failed</b>\nSee attached screenshot."
  }'
```
