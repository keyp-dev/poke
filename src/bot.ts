import { Bot, webhookCallback } from "grammy";
import { createWebhook, listWebhooks, deleteWebhook } from "./db";

export type Env = {
  DB: D1Database;
  BOT_TOKEN: string;
  WEBHOOK_BASE_URL: string;
  BOT_OWNER_ID: string;
};

function createBot(env: Env) {
  const bot = new Bot(env.BOT_TOKEN);

  bot.catch((err) => {
    console.error("Bot error:", err.message, err.stack);
  });

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Welcome to Poke!\n\n" +
        "Send /webhook to create a new webhook URL.\n" +
        "Send /list to view your webhooks.\n" +
        "Send /delete <token> to remove a webhook.\n\n" +
        "Supports private chats, groups, and group topics."
    );
  });

  bot.command("webhook", async (ctx) => {
    try {
      const chatId = ctx.chat.id.toString();
      const creatorId = ctx.from!.id.toString();
      const threadId = ctx.message?.message_thread_id ?? null;
      const token = crypto.randomUUID();
      await createWebhook(env.DB, token, chatId, threadId, creatorId);
      const url = `${env.WEBHOOK_BASE_URL}/t/${token}`;
      const example = JSON.stringify(
        {
          event: "New User Registered",
          channel: "WebApp",
          emoji: "👋",
          metadata: { email: "test@example.com" },
          notify: true,
        },
        null,
        2
      );
      let label = "this chat";
      if (threadId) label = "this topic";
      await ctx.reply(
        `<code>${url}</code>\n\n` +
          `Notifications will be sent to ${label}.\n\n` +
          `POST JSON to this URL:\n` +
          `<pre>${example}</pre>\n\n` +
          `* Only <code>event</code> is required`,
        { parse_mode: "HTML", message_thread_id: threadId ?? undefined }
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await ctx.reply(`Error: ${msg}`);
    }
  });

  bot.command("list", async (ctx) => {
    if (ctx.from!.id.toString() !== env.BOT_OWNER_ID) return;
    const chatId = ctx.chat.id.toString();
    const creatorId = ctx.from!.id.toString();
    const webhooks = await listWebhooks(env.DB, chatId, creatorId);
    if (webhooks.length === 0) {
      await ctx.reply("No webhooks found. Send /webhook to create one.");
      return;
    }
    const lines = webhooks.map((w, i) => {
      const topic = w.thread_id ? ` (topic #${w.thread_id})` : "";
      return `${i + 1}. <code>${w.token}</code>${topic}\n   Created: ${w.created_at}`;
    });
    await ctx.reply("Your webhooks:\n\n" + lines.join("\n\n"), {
      parse_mode: "HTML",
    });
  });

  bot.command("delete", async (ctx) => {
    if (ctx.from!.id.toString() !== env.BOT_OWNER_ID) return;
    const token = ctx.match.trim();
    if (!token) {
      await ctx.reply("Usage: /delete <token>");
      return;
    }
    const creatorId = ctx.from!.id.toString();
    const deleted = await deleteWebhook(env.DB, token, creatorId);
    await ctx.reply(deleted ? "Webhook deleted." : "Webhook not found.");
  });

  return bot;
}

export function handleBotWebhook(env: Env) {
  const bot = createBot(env);
  return webhookCallback(bot, "cloudflare-mod");
}
