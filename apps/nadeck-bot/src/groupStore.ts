import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Telegram's Bot API has no "list the chats I'm in" call - a bot only learns about a chat
// from an update. So we track membership ourselves: record a group's id the first time we
// see the bot join it (or see a message from it), drop it if the bot leaves/gets kicked,
// and persist to disk so the daily greeting still knows where to post after a restart.
const DATA_DIR = join(import.meta.dirname, "..", "data");
const STORE_FILE = join(DATA_DIR, "groups.json");

function load(): Set<number> {
  mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(STORE_FILE)) return new Set();
  try {
    const ids = JSON.parse(readFileSync(STORE_FILE, "utf-8"));
    return new Set(Array.isArray(ids) ? ids : []);
  } catch (err) {
    console.error("Failed to read groups.json, starting empty:", err);
    return new Set();
  }
}

const groups = load();

function persist() {
  writeFileSync(STORE_FILE, JSON.stringify([...groups]), "utf-8");
}

export function rememberGroup(chatId: number) {
  if (groups.has(chatId)) return;
  groups.add(chatId);
  persist();
}

export function forgetGroup(chatId: number) {
  if (!groups.has(chatId)) return;
  groups.delete(chatId);
  persist();
}

export function listGroups(): number[] {
  return [...groups];
}
