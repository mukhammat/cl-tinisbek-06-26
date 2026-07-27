import { config as loadEnv } from "dotenv";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Bot, type Context, type Filter } from "grammy";
import { isChatAdmin } from "./adminCache.js";
import { startGreetingScheduler } from "./scheduler.js";
import { rememberGroup, forgetGroup, listGroups } from "./groupStore.js";

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

bot.command("start", (ctx) => {
  // Bot only serves groups - no private-chat conversations.
  if (ctx.chat.type === "private") return;
  return ctx.reply(
    "Привет! Я бот поддержки Nadeck. Задай вопрос о пептидах, протоколах применения или дозировках — отвечу на основе нашей базы знаний.",
  );
});

// The only way the bot learns which groups it belongs to (there's no "list my chats" API
// call) - fires when it's added/promoted/removed/kicked. Powers the daily greeting list.
bot.on("my_chat_member", (ctx) => {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") return;

  const status = ctx.myChatMember.new_chat_member.status;
  if (status === "member" || status === "administrator") {
    rememberGroup(ctx.chat.id);
    console.log(`Добавлен в группу "${ctx.chat.title}" (id=${ctx.chat.id}) — включена в ежедневное приветствие.`);
  } else if (status === "left" || status === "kicked") {
    forgetGroup(ctx.chat.id);
    console.log(`Удалён из группы "${ctx.chat.title}" (id=${ctx.chat.id}) — исключена из рассылки.`);
  }
});

// Strips an @mention of the bot itself from the message text (cosmetic - so "@nadeck_ai_bot
// что это пептиды?" is forwarded to the backend as just "что это пептиды?").
function stripSelfMention(ctx: Filter<Context, "message:text">): string {
  const botUsername = ctx.me.username?.toLowerCase();
  const mentionEntity = ctx.message.entities?.find((e) => {
    if (e.type !== "mention") return false;
    return ctx.message.text.slice(e.offset, e.offset + e.length).toLowerCase() === `@${botUsername}`;
  });
  if (!mentionEntity) return ctx.message.text.trim();
  return (ctx.message.text.slice(0, mentionEntity.offset) + ctx.message.text.slice(mentionEntity.offset + mentionEntity.length)).trim();
}

bot.on("message:text", async (ctx) => {
  // Never answer other bots (avoids reply loops), never answer group admins - they're
  // staff talking shop, not customers asking a question - and never answer private DMs -
  // the bot only serves groups.
  if (ctx.from?.is_bot) return;
  if (ctx.chat.type === "private") return;

  const isGroup = ctx.chat.type === "group" || ctx.chat.type === "supergroup";
  if (isGroup) {
    // Fallback for groups the bot already belonged to before this feature existed, where no
    // my_chat_member event was ever delivered - a regular message is enough to register it too.
    rememberGroup(ctx.chat.id);
    if (ctx.from && (await isChatAdmin(bot, ctx.chat.id, ctx.from.id))) return;
  }

  const question = isGroup ? stripSelfMention(ctx) : ctx.message.text.trim();
  if (!question) return;

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

startGreetingScheduler(bot, listGroups);

bot.start();
console.log(`Nadeck bot запущен (backend: ${BACKEND_URL})`);
