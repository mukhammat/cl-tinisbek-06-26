import "dotenv/config";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Bot } from "grammy";
import { openai, CHAT_MODEL } from "./lib/openai.js";
import { buildSystemPrompt } from "./lib/systemPrompt.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN не задан в .env");

const SYSTEM_PROMPT = buildSystemPrompt();

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

  await ctx.replyWithChatAction("typing");

  try {
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: question },
      ],
      temperature: 0.3,
    });

    const answer = completion.choices[0].message.content ?? "Извините, не получилось сформировать ответ.";

    await ctx.reply(answer);

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
console.log("Nadeck bot запущен");
