import type { Bot } from "grammy";
import { generateGreeting, type GreetingPeriod } from "./greeting.js";

const TIMEZONE = "Asia/Almaty";
const SCHEDULE: { hour: number; minute: number; period: GreetingPeriod }[] = [
  { hour: 9, minute: 0, period: "morning" },
  { hour: 19, minute: 0, period: "evening" },
];

function almatyNow(): { dateKey: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { dateKey: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")), minute: Number(get("minute")) };
}

// Polls the clock once a minute instead of pulling in a cron dependency - simple and
// good enough for two fixed daily slots. Tracks which slots already fired today so a
// missed-then-caught-up tick (e.g. after a brief restart) doesn't double-send.
//
// getGroupChatIds is called fresh on every tick (not captured once at startup) so a group
// the bot joins mid-day is included in that same day's remaining slots automatically.
export function startGreetingScheduler(bot: Bot, getGroupChatIds: () => number[]) {
  let lastDateKey = "";
  const firedSlots = new Set<GreetingPeriod>();

  setInterval(async () => {
    const { dateKey, hour, minute } = almatyNow();
    if (dateKey !== lastDateKey) {
      lastDateKey = dateKey;
      firedSlots.clear();
    }

    const slot = SCHEDULE.find((s) => s.hour === hour && s.minute === minute);
    if (!slot || firedSlots.has(slot.period)) return;
    firedSlots.add(slot.period);

    const chatIds = getGroupChatIds();
    if (chatIds.length === 0) return;

    const text = await generateGreeting(slot.period);
    for (const chatId of chatIds) {
      try {
        await bot.api.sendMessage(chatId, text);
      } catch (err) {
        console.error(`Failed to send greeting to chat ${chatId}:`, err);
      }
    }
  }, 60_000);
}
