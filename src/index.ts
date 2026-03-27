import { Hono } from "hono";
import { Api } from "grammy";
import { handleBotWebhook, type Env } from "./bot";
import { getWebhook } from "./db";

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

// Telegram Bot webhook endpoint
app.post("/bot", async (c) => {
  const handler = handleBotWebhook(c.env);
  return handler(c.req.raw);
});

// Receive webhook events and forward to Telegram
app.post("/t/:token", async (c) => {
  const { token } = c.req.param();
  const webhook = await getWebhook(c.env.DB, token);
  if (!webhook) {
    return c.json({ error: "Webhook not found" }, 404);
  }

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const api = new Api(c.env.BOT_TOKEN);
  const chatId = webhook.chat_id;
  const threadId = webhook.thread_id ?? undefined;
  const notify = body.notify !== false;
  const parseMode = body.parse_mode === "MarkdownV2" ? "MarkdownV2" : "HTML";

  try {
    const type = (body.type as string) || "text";

    switch (type) {
      case "text": {
        const text = buildMessage(body, parseMode);
        await api.sendMessage(chatId, text, {
          parse_mode: parseMode,
          disable_notification: !notify,
          message_thread_id: threadId,
        });
        break;
      }

      case "photo": {
        const photo = body.photo as string;
        if (!photo) return c.json({ error: "Missing field: photo (URL)" }, 400);
        const caption = body.caption as string | undefined ?? buildMessage(body, parseMode);
        await api.sendPhoto(chatId, photo, {
          caption,
          parse_mode: parseMode,
          disable_notification: !notify,
          message_thread_id: threadId,
        });
        break;
      }

      case "document": {
        const document = body.document as string;
        if (!document) return c.json({ error: "Missing field: document (URL)" }, 400);
        const caption = body.caption as string | undefined ?? buildMessage(body, parseMode);
        await api.sendDocument(chatId, document, {
          caption,
          parse_mode: parseMode,
          disable_notification: !notify,
          message_thread_id: threadId,
        });
        break;
      }

      case "sticker": {
        const sticker = body.sticker as string;
        if (!sticker) return c.json({ error: "Missing field: sticker (file_id or URL)" }, 400);
        await api.sendSticker(chatId, sticker, {
          disable_notification: !notify,
          message_thread_id: threadId,
        });
        break;
      }

      case "raw": {
        const text = body.text as string;
        if (!text) return c.json({ error: "Missing field: text" }, 400);
        await api.sendMessage(chatId, text, {
          parse_mode: parseMode,
          disable_notification: !notify,
          message_thread_id: threadId,
          link_preview_options: body.link_preview === false ? { is_disabled: true } : undefined,
        });
        break;
      }

      default:
        return c.json({ error: `Unknown type: ${type}` }, 400);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: "Failed to send message", detail: msg }, 502);
  }

  return c.json({ ok: true });
});

function buildMessage(body: Record<string, unknown>, parseMode: string): string {
  const event = body.event as string;
  if (!event) return "";

  const emoji = (body.emoji as string) || "";
  const channel = body.channel as string;
  const metadata = body.metadata as Record<string, string> | undefined;

  if (parseMode === "MarkdownV2") {
    return buildMarkdownV2(event, emoji, channel, metadata);
  }
  return buildHtml(event, emoji, channel, metadata);
}

function buildHtml(event: string, emoji: string, channel: string, metadata?: Record<string, string>): string {
  let msg = "";
  if (emoji) msg += emoji + " ";
  if (channel) msg += `• #${channel}\n\n`;
  else if (emoji) msg += "\n\n";
  msg += `<b>${escapeHtml(event)}</b>`;
  if (metadata && typeof metadata === "object") {
    const entries = Object.entries(metadata);
    if (entries.length > 0) {
      msg += "\n\n" + entries.map(([k, v]) => `#${k}: ${escapeHtml(String(v))}`).join("\n");
    }
  }
  return msg;
}

function buildMarkdownV2(event: string, emoji: string, channel: string, metadata?: Record<string, string>): string {
  let msg = "";
  if (emoji) msg += emoji + " ";
  if (channel) msg += `• \\#${escapeMarkdownV2(channel)}\n\n`;
  else if (emoji) msg += "\n\n";
  msg += `*${escapeMarkdownV2(event)}*`;
  if (metadata && typeof metadata === "object") {
    const entries = Object.entries(metadata);
    if (entries.length > 0) {
      msg += "\n\n" + entries.map(([k, v]) => `\\#${escapeMarkdownV2(k)}: ${escapeMarkdownV2(String(v))}`).join("\n");
    }
  }
  return msg;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeMarkdownV2(str: string): string {
  return str.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

export default app;
