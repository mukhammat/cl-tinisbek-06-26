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

// Тексты бота. Ключи языков — коды из Telegram (`language_code`), чтобы их можно было
// сопоставлять напрямую с языком клиента участника.
const MESSAGES = {
  ru: {
    start:
      "Привет! Я приветственный бот. Добавьте меня администратором в общий чат — я буду встречать новых участников и направлять их в мужской или женский чат.",
    fallbackName: "друг",
    welcome: (name: string) => `👋 Добро пожаловать, ${name}!\n\nВыберите ваш пол:`,
    male: "👨 Мужчина",
    female: "👩 Женщина",
  },
  ar: {
    start:
      "مرحباً! أنا بوت الترحيب. أضِفني كمشرف في المجموعة العامة وسأرحّب بالأعضاء الجدد وأوجّههم إلى مجموعة الرجال أو مجموعة النساء.",
    fallbackName: "صديقي",
    welcome: (name: string) => `👋 أهلاً وسهلاً بك، ${name}!\n\nالرجاء اختيار المجموعة المناسبة لك:`,
    male: "👨 رجل",
    female: "👩 امرأة",
  },
} as const;

type Lang = keyof typeof MESSAGES;

function isLang(value: string | undefined): value is Lang {
  return value !== undefined && value in MESSAGES;
}

// Telegram отдаёт language_code вида "ar", "ar-SA", "ru-RU" — нас интересует только база.
function normalizeLang(value: string | undefined): Lang | undefined {
  const base = value?.split("-")[0]?.toLowerCase();
  return isLang(base) ? base : undefined;
}

const DEFAULT_LANG: Lang = normalizeLang(process.env.GENDER_BOT_LANG) || "ru";

// Жёсткая привязка языка к конкретному чату: "-1001234567890:ar,-1009876543210:ru".
// Нужна для группы, где язык общения не совпадает с языком Telegram-клиентов участников.
const CHAT_LANGS = new Map<string, Lang>(
  (process.env.GENDER_BOT_CHAT_LANGS || "")
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .flatMap((pair) => {
      const [chatId, lang] = pair.split(":").map((part) => part.trim());
      const normalized = normalizeLang(lang);
      if (!chatId || !normalized) {
        console.warn(`GENDER_BOT_CHAT_LANGS: пропущена некорректная пара "${pair}"`);
        return [];
      }
      return [[chatId, normalized] as const];
    }),
);

// Язык чата важнее языка клиента: в арабской группе участник с русским Telegram всё равно
// должен получить арабское приветствие.
function resolveLang(chatId: number, userLanguageCode?: string): Lang {
  return CHAT_LANGS.get(String(chatId)) || normalizeLang(userLanguageCode) || DEFAULT_LANG;
}

// Куда ведут кнопки. У арабской группы свои мужской/женский чаты — русские ссылки ей не
// подходят, поэтому набор ссылок привязан к языку приветствия.
const LINKS: Record<Lang, { male: string; female: string }> = {
  ru: { male: MALE_CHAT_LINK, female: FEMALE_CHAT_LINK },
  ar: {
    male: process.env.MALE_CHAT_LINK_AR || MALE_CHAT_LINK,
    female: process.env.FEMALE_CHAT_LINK_AR || FEMALE_CHAT_LINK,
  },
};

// Молчаливый откат на русские чаты — ровно та ошибка, которую здесь легко не заметить.
if (!process.env.MALE_CHAT_LINK_AR || !process.env.FEMALE_CHAT_LINK_AR) {
  console.warn(
    "MALE_CHAT_LINK_AR/FEMALE_CHAT_LINK_AR не заданы — арабское приветствие будет вести в чаты из MALE_CHAT_LINK/FEMALE_CHAT_LINK",
  );
}

const LOGS_DIR = join(import.meta.dirname, "..", "data", "logs");
mkdirSync(LOGS_DIR, { recursive: true });
const LOG_FILE = join(LOGS_DIR, "routing.jsonl");

function logInteraction(entry: Record<string, unknown>) {
  appendFileSync(LOG_FILE, JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + "\n", "utf-8");
}

const bot = new Bot(TOKEN);

bot.command("start", (ctx) => ctx.reply(MESSAGES[resolveLang(ctx.chat.id, ctx.from?.language_code)].start));

// Telegram delivers "new member joined" as a service message on the group itself, regardless
// of the bot's privacy mode setting (that setting only restricts regular text messages from
// other members) - so no extra BotFather configuration is needed for this to fire.
bot.on("message:new_chat_members", async (ctx) => {
  for (const member of ctx.message.new_chat_members) {
    if (member.is_bot) continue;

    const lang = resolveLang(ctx.chat.id, member.language_code);
    const t = MESSAGES[lang];

    const name = member.first_name || member.username || t.fallbackName;
    // "url" buttons open the chat immediately on tap - Telegram handles that client-side,
    // there's no round trip through the bot (and so no per-user click restriction or
    // "who picked what" logging like a callback-based flow would give us).
    const links = LINKS[lang];
    const keyboard = new InlineKeyboard().url(t.male, links.male).url(t.female, links.female);

    await ctx.reply(t.welcome(name), {
      reply_markup: keyboard,
    });

    logInteraction({ event: "welcomed", userId: member.id, username: member.username, chatId: ctx.chat.id, lang });
  }
});

// Печатаем chat_id при добавлении бота в группу — без него не заполнить GENDER_BOT_CHAT_LANGS.
bot.on("my_chat_member", (ctx) => {
  console.log(
    `Бот в чате "${ctx.chat.title ?? ctx.chat.id}": chat_id=${ctx.chat.id}, ` +
      `статус=${ctx.myChatMember.new_chat_member.status}, язык=${resolveLang(ctx.chat.id)}`,
  );
});

bot.catch((err) => console.error("Bot error:", err));

bot.start();
console.log("Gender router bot запущен");
