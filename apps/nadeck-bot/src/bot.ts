import { config as loadEnv } from "dotenv";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Bot, type Context, type Filter } from "grammy";

// Single shared .env at the repo root (same file backend reads), not a per-app copy.
loadEnv({ path: join(import.meta.dirname, "..", "..", "..", ".env") });

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN не задан в .env");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// How many prior turns (user+assistant pairs) to keep per chat as context for the backend.
const HISTORY_LIMIT = 10;

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const chatHistories = new Map<number, ChatMessage[]>();

const LOGS_DIR = join(import.meta.dirname, "..", "data", "logs");
mkdirSync(LOGS_DIR, { recursive: true });
const LOG_FILE = join(LOGS_DIR, "conversations.jsonl");

function logInteraction(entry: Record<string, unknown>) {
  appendFileSync(LOG_FILE, JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + "\n", "utf-8");
}

const bot = new Bot(TOKEN);

bot.command("start", (ctx) =>
  ctx.reply(
    "Привет! Я бот поддержки Nadeck. Задай вопрос о пептидах, протоколах применения или дозировках — отвечу на основе нашей базы знаний.",
  ),
);

// In groups the bot must only jump in when addressed directly - otherwise every message
// between members would get an AI reply. Telegram's own privacy-mode filtering on the
// Bot API side is not reliable enough on its own (depends on BotFather settings and
// whether the mention was recognized as a proper entity), so we gate here too.
function extractGroupQuestion(ctx: Filter<Context, "message:text">): string | null {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") return ctx.message.text;

  const isReplyToBot = ctx.message.reply_to_message?.from?.id === ctx.me.id;
  const botUsername = ctx.me.username?.toLowerCase();
  const mentionEntity = ctx.message.entities?.find((e) => {
    if (e.type !== "mention") return false;
    const mentionText = ctx.message.text.slice(e.offset, e.offset + e.length).toLowerCase();
    return mentionText === `@${botUsername}`;
  });

  if (!isReplyToBot && !mentionEntity) return null;

  if (mentionEntity) {
    return (ctx.message.text.slice(0, mentionEntity.offset) + ctx.message.text.slice(mentionEntity.offset + mentionEntity.length)).trim();
  }
  return ctx.message.text.trim();
}

bot.on("message:text", async (ctx) => {
  const question = extractGroupQuestion(ctx);
  if (question === null) return;
  if (!question) {
    await ctx.reply("Слушаю! Задайте вопрос о пептидах или других товарах Nadeck.");
    return;
  }

  const chatId = ctx.chat.id;
  const history = chatHistories.get(chatId) ?? [];

  await ctx.replyWithChatAction("typing");

  try {
    const res = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: question, history }),
    });

    if (!res.ok) throw new Error(`Backend chat API returned ${res.status}`);

    const data = (await res.json()) as { reply?: string };
    const answer = data.reply || "Извините, не получилось сформировать ответ.";

    await ctx.reply(answer);

    const updatedHistory = [
      ...history,
      { role: "user" as const, text: question },
      { role: "assistant" as const, text: answer },
    ].slice(-HISTORY_LIMIT * 2);
    chatHistories.set(chatId, updatedHistory);

    logInteraction({
      userId: ctx.from?.id,
      username: ctx.from?.username,
      question,
      answer,
    });
  } catch (err) {
    console.error(err);
    await ctx.reply("Произошла ошибка при обработке запроса. Попробуйте ещё раз чуть позже.");
    logInteraction({ userId: ctx.from?.id, username: ctx.from?.username, question, error: String(err) });
  }
});

bot.catch((err) => console.error("Bot error:", err));

bot.start();
console.log(`Nadeck bot запущен (backend: ${BACKEND_URL})`);
