import { Hono } from "hono";
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

  const event = body.event as string;
  if (!event) {
    return c.json({ error: "Missing required field: event" }, 400);
  }

  const emoji = (body.emoji as string) || "";
  const channel = body.channel as string;
  const metadata = body.metadata as Record<string, string> | undefined;
  const notify = body.notify !== false;

  // Build message
  let message = "";
  if (emoji) message += emoji + " ";
  if (channel) message += `• #${channel}\n\n`;
  else if (emoji) message += "\n\n";
  message += `<b>${escapeHtml(event)}</b>`;
  if (metadata && typeof metadata === "object") {
    const entries = Object.entries(metadata);
    if (entries.length > 0) {
      message += "\n\n" + entries.map(([k, v]) => `#${k}: ${escapeHtml(String(v))}`).join("\n");
    }
  }

  // Send via Telegram Bot API
  const url = `https://api.telegram.org/bot${c.env.BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: webhook.chat_id,
      text: message,
      parse_mode: "HTML",
      disable_notification: !notify,
      ...(webhook.thread_id ? { message_thread_id: webhook.thread_id } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return c.json({ error: "Failed to send message", detail: err }, 502);
  }

  return c.json({ ok: true });
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default app;
