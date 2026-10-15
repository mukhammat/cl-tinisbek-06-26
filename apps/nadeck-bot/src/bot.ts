import { config as loadEnv } from "dotenv";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Bot, type Context, type Filter } from "grammy";
import { isChatAdmin } from "./adminCache.js";
import { rememberGroup, forgetGroup } from "./groupStore.js";
import { groupOrderButton, handOverKeyboard, notifyManagers, type PlacedOrder } from "./shop.js";

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

// Private chat is where customers talk to the advisor as a sales consultant and place orders
// (sales mode, see shop.ts); groups only get Q&A plus a link into the private chat.
bot.command("start", (ctx) => {
  if (ctx.chat.type === "private") {
    return ctx.reply(
      "Здравствуйте! Я консультант Nadeck 🙂 Расскажите, какая у вас цель или что вас интересует — подскажу, что подойдёт, расскажу про применение и помогу оформить заказ.",
    );
  }
  return ctx.reply(
    "Привет! Я бот поддержки Nadeck. Задай вопрос о пептидах, протоколах применения или дозировках — отвечу на основе нашей базы знаний.",
  );
});

// The only way the bot learns which groups it belongs to (there's no "list my chats" API
// call) - fires when it's added/promoted/removed/kicked.
bot.on("my_chat_member", (ctx) => {
  if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") return;

  const status = ctx.myChatMember.new_chat_member.status;
  if (status === "member" || status === "administrator") {
    rememberGroup(ctx.chat.id);
    console.log(`Добавлен в группу "${ctx.chat.title}" (id=${ctx.chat.id}).`);
  } else if (status === "left" || status === "kicked") {
    forgetGroup(ctx.chat.id);
    console.log(`Удалён из группы "${ctx.chat.title}" (id=${ctx.chat.id}).`);
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
  // Never answer other bots (avoids reply loops) and never answer group admins - they're
  // staff talking shop, not customers asking a question.
  if (ctx.from?.is_bot) return;

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
      // In a private chat the advisor also sells: it can place the order itself (sales mode).
      body: JSON.stringify(
        isGroup
          ? { message: question, history }
          : { message: question, history, mode: "sales", customer: { id: ctx.from?.id, username: ctx.from?.username } },
      ),
    });

    if (!res.ok) throw new Error(`Backend chat API returned ${res.status}`);

    const data = (await res.json()) as { reply?: string; order?: PlacedOrder; photos?: { url: string; caption: string }[] };
    // The prompt asks for plain text, but bold markers still slip through now and then, and
    // Telegram would show them as literal asterisks.
    const answer = data.reply?.replace(/\*\*|__/g, "").trim();

    // Photos the advisor chose to show (sales mode) go first, so the text reads as their caption.
    if (data.photos?.length) {
      await (data.photos.length === 1
        ? ctx.replyWithPhoto(data.photos[0].url, { caption: data.photos[0].caption })
        : ctx.replyWithMediaGroup(data.photos.map((p) => ({ type: "photo" as const, media: p.url, caption: p.caption })))
      ).catch((err) => console.error("Failed to send product photos", err));
    }

    if (!answer) {
      // Backend has no reliable answer - in a group stay silent instead of saying "I don't
      // know"; in a private chat the customer is waiting on a reply, so ask them to rephrase.
      logInteraction({ userId: ctx.from?.id, username: ctx.from?.username, question, answer: null });
      if (!isGroup) await ctx.reply("Извините, не совсем понял. Можете переформулировать?");
      return;
    }

    if (data.order) {
      await ctx.reply(answer, { reply_markup: handOverKeyboard(data.order) });
      await notifyManagers(ctx.api, data.order, ctx.from!.id, ctx.from?.username);
      logInteraction({ userId: ctx.from?.id, username: ctx.from?.username, orderId: data.order.id });
    } else {
      // A failed catalog lookup must not swallow the answer itself.
      const button = isGroup ? await groupOrderButton(answer, ctx.me.username).catch(() => undefined) : undefined;
      await ctx.reply(answer, { reply_markup: button });
    }

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
