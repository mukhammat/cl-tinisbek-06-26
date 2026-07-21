import type { Bot } from "grammy";

// Telegram has no per-message "is this sender an admin" field, so we cache each group's
// admin list and refresh it periodically rather than calling getChatAdministrators on
// every single incoming message.
const ADMIN_CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  adminIds: Set<number>;
  fetchedAt: number;
}

const cache = new Map<number, CacheEntry>();

export async function isChatAdmin(bot: Bot, chatId: number, userId: number): Promise<boolean> {
  const entry = cache.get(chatId);
  const isStale = !entry || Date.now() - entry.fetchedAt > ADMIN_CACHE_TTL_MS;
  if (!isStale) return entry.adminIds.has(userId);

  try {
    const admins = await bot.api.getChatAdministrators(chatId);
    const adminIds = new Set(admins.map((a) => a.user.id));
    cache.set(chatId, { adminIds, fetchedAt: Date.now() });
    return adminIds.has(userId);
  } catch (err) {
    console.error(`Failed to fetch chat admins for ${chatId}:`, err);
    // Fall back to the last known snapshot rather than failing the whole message; if we've
    // never fetched successfully, assume not-admin so the bot still answers regular users.
    return entry ? entry.adminIds.has(userId) : false;
  }
}
