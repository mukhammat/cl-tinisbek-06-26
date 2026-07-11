import { config as loadEnv } from "dotenv";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Bot } from "grammy";

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

bot.on("message:text", async (ctx) => {
  const question = ctx.message.text;
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
