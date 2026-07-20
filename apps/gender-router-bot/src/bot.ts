import { config as loadEnv } from "dotenv";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Bot, InlineKeyboard } from "grammy";

// Single shared .env at the repo root (same file the other apps read), not a per-app copy.
loadEnv({ path: join(import.meta.dirname, "..", "..", "..", ".env") });

const TOKEN = process.env.GENDER_BOT_TOKEN;
if (!TOKEN) throw new Error("GENDER_BOT_TOKEN не задан в .env");

// Where the "Мужчина"/"Женщина" buttons send people. Real invite links, not usernames -
// swap these in .env once the male/female chats exist.
const MALE_CHAT_LINK = process.env.MALE_CHAT_LINK || "https://t.me/male_chat";
const FEMALE_CHAT_LINK = process.env.FEMALE_CHAT_LINK || "https://t.me/female_chat";

const LOGS_DIR = join(import.meta.dirname, "..", "data", "logs");
mkdirSync(LOGS_DIR, { recursive: true });
const LOG_FILE = join(LOGS_DIR, "routing.jsonl");

function logInteraction(entry: Record<string, unknown>) {
  appendFileSync(LOG_FILE, JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + "\n", "utf-8");
}

const bot = new Bot(TOKEN);

bot.command("start", (ctx) =>
  ctx.reply(
    "Привет! Я приветственный бот. Добавьте меня администратором в общий чат — я буду встречать новых участников и направлять их в мужской или женский чат.",
  ),
);

// Telegram delivers "new member joined" as a service message on the group itself, regardless
// of the bot's privacy mode setting (that setting only restricts regular text messages from
// other members) - so no extra BotFather configuration is needed for this to fire.
bot.on("message:new_chat_members", async (ctx) => {
  for (const member of ctx.message.new_chat_members) {
    if (member.is_bot) continue;

    const name = member.first_name || member.username || "друг";
    // The user's id is baked into callback_data so only the person who joined can answer
    // for themselves - anyone else tapping the button gets rejected in the handler below.
    const keyboard = new InlineKeyboard()
      .text("👨 Мужчина", `gender:male:${member.id}`)
      .text("👩 Женщина", `gender:female:${member.id}`);

    await ctx.reply(`👋 Добро пожаловать, ${name}!\n\nВыберите ваш пол:`, {
      reply_markup: keyboard,
    });

    logInteraction({ event: "welcomed", userId: member.id, username: member.username, chatId: ctx.chat.id });
  }
});

bot.on("callback_query:data", async (ctx) => {
  const match = ctx.callbackQuery.data.match(/^gender:(male|female):(\d+)$/);
  if (!match) {
    await ctx.answerCallbackQuery();
    return;
  }

  const [, gender, targetUserId] = match;
  if (String(ctx.callbackQuery.from.id) !== targetUserId) {
    await ctx.answerCallbackQuery({ text: "Эта кнопка не для вас 🙂", show_alert: true });
    return;
  }

  const isMale = gender === "male";
  const link = isMale ? MALE_CHAT_LINK : FEMALE_CHAT_LINK;
  const label = isMale ? "👨 Мужчина" : "👩 Женщина";

  await ctx.answerCallbackQuery();
  // Clear the buttons explicitly - editMessageText alone leaves the old inline keyboard
  // attached, since text and reply_markup are edited independently on Telegram's side.
  await ctx.editMessageText(`${label}\n\n✅ Отлично! Вот ваша ссылка:\n${link}`, {
    reply_markup: { inline_keyboard: [] },
  });

  logInteraction({ event: "routed", userId: ctx.callbackQuery.from.id, gender, chatId: ctx.chat?.id });
});

bot.catch((err) => console.error("Bot error:", err));

bot.start();
console.log("Gender router bot запущен");
