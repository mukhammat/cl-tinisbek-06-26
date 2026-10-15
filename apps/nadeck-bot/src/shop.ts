import { InlineKeyboard, type Api } from "grammy";

// Selling happens in conversation: in a private chat the bot calls /api/chat in "sales" mode
// and the backend's advisor recommends products, collects the customer's details and places
// the order itself (place_order tool, priced server-side). All that's left for the bot is to
// hand the finished order over to a manager, who confirms it and takes payment.

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
// Where the hand-over link leads. A Telegram username wins (t.me/<name>?text=... prefills the
// message); otherwise the same WhatsApp number the website's checkout uses.
const MANAGER_TELEGRAM = (process.env.MANAGER_TELEGRAM || "").replace(/^@/, "").trim();
const MANAGER_WHATSAPP = (process.env.MANAGER_WHATSAPP || "77070222312").replace(/\D/g, "");
// Optional: chat (manager's private chat with the bot, or a staff group) that gets a copy of
// every order, so the manager can reach out even if the customer never presses the link.
const MANAGER_CHAT_ID = process.env.MANAGER_CHAT_ID?.trim() || "";

const CATALOG_CACHE_MS = 5 * 60 * 1000;

export interface PlacedOrder {
  id: string;
  items: { medicineName: Record<string, string>; mgPerUnit: number; unit: string; price: number; quantity: number }[];
  subtotal: number;
  delivery: number;
  totalPrice: number;
  address: { country?: string; city?: string; street?: string; name?: string; phone?: string; telegram?: string };
}

const UNIT_LABELS: Record<string, string> = { mg: "мг", ml: "мл", pcs: "шт" };
const money = (kzt: number) => `${Math.round(kzt).toLocaleString("ru-RU")} ₸`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const nameHead = (name: string) => name.split(/\s+—\s+/)[0].trim();

function managerUrl(text: string): string {
  const encoded = encodeURIComponent(text);
  return MANAGER_TELEGRAM ? `https://t.me/${MANAGER_TELEGRAM}?text=${encoded}` : `https://wa.me/${MANAGER_WHATSAPP}?text=${encoded}`;
}

function orderText(order: PlacedOrder, heading: string): string {
  const a = order.address;
  return [
    heading,
    "",
    ...order.items.map(
      (i) => `• ${nameHead(i.medicineName?.ru || i.medicineName?.en || "")}, ${i.mgPerUnit} ${UNIT_LABELS[i.unit] || ""} × ${i.quantity} — ${money(i.price * i.quantity)}`,
    ),
    "",
    ...(order.delivery ? [`Доставка: ${money(order.delivery)}`] : []),
    `Итого: ${money(order.totalPrice)}`,
    "",
    `Имя: ${a.name || "—"}`,
    `Телефон: ${a.phone || "—"}`,
    `Адрес: ${[a.country, a.city, a.street].filter(Boolean).join(", ") || "—"}`,
    ...(a.telegram ? [`Telegram: ${a.telegram}`] : []),
  ].join("\n");
}

// Link button under the advisor's "order placed" message: opens the manager's chat with the
// whole order prefilled, the way the website's checkout hands off to WhatsApp.
export function handOverKeyboard(order: PlacedOrder): InlineKeyboard {
  return new InlineKeyboard().url("📨 Отправить заказ менеджеру", managerUrl(orderText(order, `Здравствуйте! Мой заказ ${order.id} из Telegram-бота Nadeck:`)));
}

export async function notifyManagers(api: Api, order: PlacedOrder, userId: number, username?: string) {
  if (!MANAGER_CHAT_ID) return;
  const userLink = username ? "" : `\n<a href="tg://user?id=${userId}">Открыть чат с клиентом</a>`;
  await api
    .sendMessage(MANAGER_CHAT_ID, `🆕 ${esc(orderText(order, `Новый заказ ${order.id} (Telegram-бот)`))}${userLink}`, { parse_mode: "HTML" })
    .catch((err) => console.error("Failed to notify manager chat", err));
}

// --- groups ----------------------------------------------------------------------------------
// Contacts and addresses shouldn't be typed in front of a whole group, so when an answer there
// talks about something we sell, one link button invites the customer into the private chat.

let aliasCache: { aliases: string[]; fetchedAt: number } = { aliases: [], fetchedAt: 0 };

async function productAliases(): Promise<string[]> {
  if (Date.now() - aliasCache.fetchedAt < CATALOG_CACHE_MS) return aliasCache.aliases;
  try {
    const res = await fetch(`${BACKEND_URL}/api/medicines?market=main`);
    if (!res.ok) throw new Error(`catalog returned ${res.status}`);
    const products = (await res.json()) as { name: Record<string, string>; inStock: boolean }[];
    const aliases = new Set<string>();
    for (const p of products.filter((x) => x.inStock)) {
      for (const name of [p.name?.ru, p.name?.en]) {
        const head = nameHead(name || "");
        if (!head) continue;
        aliases.add(head);
        // "Рета (Retarutide)" -> also "Рета" and "Retarutide" on their own
        const m = head.match(/^(.*?)\s*\((.*?)\)\s*$/);
        if (m) [m[1], m[2]].forEach((x) => aliases.add(x.trim()));
      }
    }
    aliasCache = { aliases: [...aliases].filter((a) => a.length >= 3).map((a) => a.toLowerCase()), fetchedAt: Date.now() };
  } catch (err) {
    console.error("Failed to load catalog for product mentions", err);
  }
  return aliasCache.aliases;
}

export async function groupOrderButton(answer: string, botUsername: string): Promise<InlineKeyboard | undefined> {
  const lower = answer.toLowerCase();
  const aliases = await productAliases();
  if (!aliases.some((a) => lower.includes(a))) return undefined;
  return new InlineKeyboard().url("🛒 Подобрать и заказать в личке", `https://t.me/${botUsername}?start=shop`);
}
