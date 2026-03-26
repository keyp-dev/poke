export interface Webhook {
  token: string;
  chat_id: string;
  thread_id: number | null;
  creator_id: string;
}

export async function createWebhook(
  db: D1Database,
  token: string,
  chatId: string,
  threadId: number | null,
  creatorId: string
) {
  await db
    .prepare("INSERT INTO webhooks (token, chat_id, thread_id, creator_id) VALUES (?, ?, ?, ?)")
    .bind(token, chatId, threadId, creatorId)
    .run();
}

export async function getWebhook(db: D1Database, token: string) {
  return db.prepare("SELECT * FROM webhooks WHERE token = ?").bind(token).first<Webhook>();
}

export async function listWebhooks(db: D1Database, chatId: string, creatorId: string) {
  const { results } = await db
    .prepare("SELECT token, thread_id, created_at FROM webhooks WHERE chat_id = ? AND creator_id = ?")
    .bind(chatId, creatorId)
    .all<{ token: string; thread_id: number | null; created_at: string }>();
  return results;
}

export async function deleteWebhook(db: D1Database, token: string, creatorId: string) {
  const result = await db
    .prepare("DELETE FROM webhooks WHERE token = ? AND creator_id = ?")
    .bind(token, creatorId)
    .run();
  return result.meta.changes > 0;
}
