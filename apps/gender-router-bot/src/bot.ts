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
    // "url" buttons open the chat immediately on tap - Telegram handles that client-side,
    // there's no round trip through the bot (and so no per-user click restriction or
    // "who picked what" logging like a callback-based flow would give us).
    const keyboard = new InlineKeyboard()
      .url("👨 Мужчина", MALE_CHAT_LINK)
      .url("👩 Женщина", FEMALE_CHAT_LINK);

    await ctx.reply(`👋 Добро пожаловать, ${name}!\n\nВыберите ваш пол:`, {
      reply_markup: keyboard,
    });

    logInteraction({ event: "welcomed", userId: member.id, username: member.username, chatId: ctx.chat.id });
  }
});

bot.catch((err) => console.error("Bot error:", err));

bot.start();
console.log("Gender router bot запущен");
