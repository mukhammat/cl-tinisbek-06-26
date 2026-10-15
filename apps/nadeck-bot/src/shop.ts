import { createHash } from "node:crypto";
import { Composer, InlineKeyboard, Keyboard, type Context } from "grammy";

// Sales flow for private chats: catalog -> product card -> pack size -> quantity -> cart ->
// contacts -> order. The bot stays a thin client: the catalog is read from the same public
// API the storefront uses, and the order is priced by the backend (POST /api/orders/telegram).
// Payment is never taken here - after checkout the customer is handed over to a manager with
// the whole order prefilled, which is how the site's WhatsApp checkout works too.

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
// Where "write to manager" leads. A Telegram username wins (t.me/<name>?text=... prefills the
// message); otherwise the same WhatsApp number the website's checkout uses.
const MANAGER_TELEGRAM = (process.env.MANAGER_TELEGRAM || "").replace(/^@/, "").trim();
const MANAGER_WHATSAPP = (process.env.MANAGER_WHATSAPP || "77070222312").replace(/\D/g, "");
// Optional: chat (manager's private chat with the bot, or a staff group) that gets a copy of
// every order, so nothing is lost if the customer never presses the hand-over button.
const MANAGER_CHAT_ID = process.env.MANAGER_CHAT_ID?.trim() || "";

const CATALOG_CACHE_MS = 5 * 60 * 1000;
const MAX_QUANTITY_BUTTONS = 5;

type Unit = "mg" | "ml" | "pcs";
interface Volume {
  mgPerUnit: number;
  price: number;
}
interface Product {
  id: string;
  name: Record<string, string>;
  category: string;
  type: string;
  unit: Unit;
  description: Record<string, string>;
  images: string[];
  inStock: boolean;
  indications?: Record<string, string[]>;
  contraindications?: Record<string, string[]>;
  usage?: Record<string, string>;
  volumes: Volume[];
}
interface Category {
  id: string;
  name: Record<string, string>;
  sortOrder: number;
}
interface Country {
  code: string;
  name: Record<string, string>;
  priceKzt: number;
}

interface CartItem {
  productId: string;
  mgPerUnit: number;
  quantity: number;
}
type Step = "name" | "phone" | "city" | "street";
interface Session {
  cart: CartItem[];
  step: Step | null;
  contacts: { country?: string; name?: string; phone?: string; city?: string; street?: string };
}

// In memory on purpose: a cart is a few minutes of browsing, and the placed order itself lives
// in the database. A restart only costs an unfinished cart.
const sessions = new Map<number, Session>();
function session(userId: number): Session {
  let s = sessions.get(userId);
  if (!s) {
    s = { cart: [], step: null, contacts: {} };
    sessions.set(userId, s);
  }
  return s;
}

// --- catalog ---------------------------------------------------------------------------------

let catalog: { products: Product[]; categories: Category[]; countries: Country[] } = { products: [], categories: [], countries: [] };
let catalogFetchedAt = 0;

// Product/category ids are slugs of the full name and can exceed Telegram's 64-byte
// callback_data/deep-link limit, so buttons carry a short stable hash instead.
const shortKey = (id: string) => createHash("sha1").update(id).digest("hex").slice(0, 10);

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return (await res.json()) as T;
}

async function loadCatalog() {
  if (Date.now() - catalogFetchedAt < CATALOG_CACHE_MS && catalog.products.length) return catalog;
  try {
    const [products, categories, countries] = await Promise.all([
      getJson<Product[]>("/api/medicines?market=main"),
      getJson<Category[]>("/api/categories?market=main"),
      getJson<Country[]>("/api/delivery-countries?market=main"),
    ]);
    catalog = {
      products: products.filter((p) => p.inStock),
      categories: [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
      countries,
    };
    catalogFetchedAt = Date.now();
  } catch (err) {
    // Keep the previous snapshot rather than failing the whole conversation.
    console.error("Shop: failed to load catalog", err);
  }
  return catalog;
}

const findProduct = (key: string) => catalog.products.find((p) => shortKey(p.id) === key || p.id === key);
const pricedVolumes = (p: Product) => (p.volumes || []).filter((v) => Number(v.price) > 0);

// "Tirzepatide (Тирзепатид) — двойной агонист..." -> "Tirzepatide (Тирзепатид)"
function shortName(p: Product): string {
  const full = (p.name?.ru || p.name?.en || p.id).trim();
  const head = full.split(/\s+—\s+/)[0].trim();
  return head.length > 40 ? head.slice(0, 39) + "…" : head;
}

// Words the advisor might use for a product in its answer: the name before the dash, plus
// each half of "Рета (Retarutide)" on its own.
function aliases(p: Product): string[] {
  const out = new Set<string>();
  for (const name of [p.name?.ru, p.name?.en]) {
    const head = (name || "").split(/\s+—\s+/)[0].trim();
    if (!head) continue;
    out.add(head);
    const m = head.match(/^(.*?)\s*\((.*?)\)\s*$/);
    if (m) {
      out.add(m[1].trim());
      out.add(m[2].trim());
    }
  }
  return [...out].filter((a) => a.length >= 3).map((a) => a.toLowerCase());
}

const UNIT_LABELS: Record<Unit, string> = { mg: "мг", ml: "мл", pcs: "шт" };
const money = (kzt: number) => `${Math.round(kzt).toLocaleString("ru-RU")} ₸`;
const packLabel = (p: Product, mg: number) => `${mg} ${UNIT_LABELS[p.unit] || ""}`.trim();
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s);

// --- manager hand-over -----------------------------------------------------------------------

function managerUrl(text: string): string {
  const encoded = encodeURIComponent(text);
  return MANAGER_TELEGRAM ? `https://t.me/${MANAGER_TELEGRAM}?text=${encoded}` : `https://wa.me/${MANAGER_WHATSAPP}?text=${encoded}`;
}

function cartLines(cart: CartItem[]): { lines: string[]; subtotal: number } {
  let subtotal = 0;
  const lines = cart.flatMap((item) => {
    const p = findProduct(item.productId);
    const v = p?.volumes.find((x) => x.mgPerUnit === item.mgPerUnit);
    if (!p || !v) return [];
    subtotal += v.price * item.quantity;
    return [`• ${shortName(p)}, ${packLabel(p, item.mgPerUnit)} × ${item.quantity} — ${money(v.price * item.quantity)}`];
  });
  return { lines, subtotal };
}

function deliveryFee(s: Session): number {
  return catalog.countries.find((c) => c.code === s.contacts.country)?.priceKzt ?? 0;
}

function contactLines(s: Session, username?: string): string[] {
  const c = s.contacts;
  const country = catalog.countries.find((x) => x.code === c.country)?.name?.ru;
  return [
    `Имя: ${c.name || "—"}`,
    `Телефон: ${c.phone || "—"}`,
    `Адрес: ${[country, c.city, c.street].filter(Boolean).join(", ") || "—"}`,
    ...(username ? [`Telegram: @${username}`] : []),
  ];
}

function orderText(s: Session, heading: string, username?: string): string {
  const { lines, subtotal } = cartLines(s.cart);
  const fee = deliveryFee(s);
  return [
    heading,
    "",
    ...lines,
    "",
    ...(fee ? [`Доставка: ${money(fee)}`] : []),
    `Итого: ${money(subtotal + fee)}`,
    "",
    ...contactLines(s, username),
  ].join("\n");
}

// --- screens ---------------------------------------------------------------------------------

async function show(ctx: Context, text: string, keyboard: InlineKeyboard, previewUrl?: string) {
  const options = {
    parse_mode: "HTML" as const,
    reply_markup: keyboard,
    link_preview_options: previewUrl ? { url: previewUrl, show_above_text: true } : { is_disabled: true },
  };
  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, options);
      return;
    } catch (err) {
      if (String(err).includes("message is not modified")) return;
      // Fall through - e.g. the message is too old to edit.
    }
  }
  await ctx.reply(text, options);
}

function cartButtonLabel(s: Session) {
  const count = s.cart.reduce((n, i) => n + i.quantity, 0);
  return count ? `🧺 Корзина (${count})` : "🧺 Корзина";
}

async function showCategories(ctx: Context) {
  const { categories, products } = await loadCatalog();
  session(ctx.from!.id).step = null;
  const kb = new InlineKeyboard();
  for (const c of categories) {
    if (!products.some((p) => p.category === c.id)) continue;
    kb.text(c.name?.ru || c.id, `c:${shortKey(c.id)}`).row();
  }
  kb.text(cartButtonLabel(session(ctx.from!.id)), "cart");
  await show(ctx, products.length ? "🛍 <b>Каталог Nadeck</b>\nВыберите раздел:" : "Каталог временно недоступен, попробуйте чуть позже.", kb);
}

async function showCategory(ctx: Context, key: string) {
  const { categories, products } = await loadCatalog();
  const category = categories.find((c) => shortKey(c.id) === key);
  const items = products.filter((p) => category && p.category === category.id);
  const kb = new InlineKeyboard();
  for (const p of items) {
    const prices = pricedVolumes(p).map((v) => v.price);
    const label = prices.length ? `${shortName(p)} — от ${money(Math.min(...prices))}` : shortName(p);
    kb.text(label, `p:${shortKey(p.id)}`).row();
  }
  kb.text("⬅️ Назад", "cat").text(cartButtonLabel(session(ctx.from!.id)), "cart");
  await show(ctx, `<b>${esc(category?.name?.ru || "Раздел")}</b>\nВыберите товар:`, kb);
}

function bulletList(lines: string[] | undefined): string {
  return (lines || []).map((l) => l.trim()).filter(Boolean).join("\n");
}

async function showProduct(ctx: Context, key: string) {
  await loadCatalog();
  session(ctx.from!.id).step = null;
  const p = findProduct(key);
  if (!p) {
    await show(ctx, "Этого товара сейчас нет в наличии.", new InlineKeyboard().text("🛍 Каталог", "cat"));
    return;
  }

  const sections = [`<b>${esc(shortName(p))}</b>`];
  if (p.description?.ru) sections.push(esc(clip(p.description.ru.trim(), 700)));
  const indications = bulletList(p.indications?.ru);
  if (indications) sections.push(`<b>Для чего применяется</b>\n${esc(clip(indications, 900))}`);
  const contraindications = bulletList(p.contraindications?.ru);
  if (contraindications) sections.push(`<b>Противопоказания</b>\n${esc(clip(contraindications, 700))}`);
  if (p.usage?.ru?.trim()) sections.push(`<b>Применение</b>\n${esc(clip(p.usage.ru.trim(), 600))}`);

  const volumes = pricedVolumes(p);
  sections.push(
    volumes.length
      ? `<b>Цена</b>\n${volumes.map((v) => `${packLabel(p, v.mgPerUnit)} — ${money(v.price)}`).join("\n")}`
      : "<b>Цена</b>\nУточняйте у менеджера",
  );

  const kb = new InlineKeyboard();
  for (const v of volumes) kb.text(`🛒 ${packLabel(p, v.mgPerUnit)} — ${money(v.price)}`, `v:${shortKey(p.id)}:${v.mgPerUnit}`).row();
  kb.url("💬 Написать менеджеру", managerUrl(`Здравствуйте! Интересует ${shortName(p)}.`)).row();
  kb.text("⬅️ Каталог", `c:${shortKey(p.category)}`).text(cartButtonLabel(session(ctx.from!.id)), "cart");

  await show(ctx, clip(sections.join("\n\n"), 4000), kb, p.images?.[0]);
}

async function showQuantity(ctx: Context, key: string, mg: number) {
  await loadCatalog();
  const p = findProduct(key);
  const v = p && pricedVolumes(p).find((x) => x.mgPerUnit === mg);
  if (!p || !v) return showCategories(ctx);
  const kb = new InlineKeyboard();
  for (let n = 1; n <= MAX_QUANTITY_BUTTONS; n++) kb.text(String(n), `q:${key}:${mg}:${n}`);
  kb.row().text("⬅️ Назад", `p:${key}`);
  await show(ctx, `<b>${esc(shortName(p))}</b>, ${packLabel(p, mg)} — ${money(v.price)}\nСколько штук добавить в корзину?`, kb);
}

async function showCart(ctx: Context) {
  await loadCatalog();
  const s = session(ctx.from!.id);
  s.step = null;
  // Drop anything that sold out or was removed from the catalog since it was added.
  s.cart = s.cart.filter((i) => findProduct(i.productId)?.volumes.some((v) => v.mgPerUnit === i.mgPerUnit && v.price > 0));
  if (!s.cart.length) {
    await show(ctx, "🧺 Корзина пуста.", new InlineKeyboard().text("🛍 Каталог", "cat"));
    return;
  }
  const { lines, subtotal } = cartLines(s.cart);
  const kb = new InlineKeyboard();
  s.cart.forEach((item, i) => {
    const p = findProduct(item.productId)!;
    kb.text(`❌ ${shortName(p)}, ${packLabel(p, item.mgPerUnit)}`, `rm:${i}`).row();
  });
  kb.text("✅ Оформить заказ", "co").row().text("🛍 Продолжить покупки", "cat");
  await show(ctx, `🧺 <b>Корзина</b>\n\n${esc(lines.join("\n"))}\n\nТовары на сумму: <b>${money(subtotal)}</b>`, kb);
}

// --- checkout --------------------------------------------------------------------------------

const PROMPTS: Record<Step, string> = {
  name: "Как к вам обращаться? Напишите имя.",
  phone: "Отправьте номер телефона кнопкой ниже или напишите его сообщением.",
  city: "В какой город доставить?",
  street: "Улица, дом, квартира:",
};

async function ask(ctx: Context, step: Step) {
  session(ctx.from!.id).step = step;
  const markup =
    step === "phone"
      ? new Keyboard().requestContact("📱 Отправить номер").resized().oneTime()
      : { remove_keyboard: true as const };
  await ctx.reply(PROMPTS[step], { reply_markup: markup });
}

async function startCheckout(ctx: Context) {
  const { countries } = await loadCatalog();
  const s = session(ctx.from!.id);
  if (!s.cart.length) return showCart(ctx);
  s.contacts = {};
  if (countries.length > 1) {
    const kb = new InlineKeyboard();
    for (const c of countries) kb.text(`${c.name?.ru || c.code} — доставка ${money(c.priceKzt)}`, `cc:${c.code}`).row();
    kb.text("⬅️ Корзина", "cart");
    await show(ctx, "Куда доставить заказ?", kb);
    return;
  }
  s.contacts.country = countries[0]?.code;
  await ask(ctx, "name");
}

async function showSummary(ctx: Context) {
  const s = session(ctx.from!.id);
  s.step = null;
  const kb = new InlineKeyboard()
    .text("✅ Купить", "ok")
    .row()
    .url("💬 Написать менеджеру", managerUrl(orderText(s, "Здравствуйте! Хочу заказать:", ctx.from?.username)))
    .row()
    .text("✏️ Изменить данные", "co")
    .text("🧺 Корзина", "cart");
  await ctx.reply(
    `${esc(orderText(s, "📋 Проверьте заказ", ctx.from?.username))}\n\nНажмите «Купить» — заказ будет передан менеджеру, он свяжется с вами для оплаты.`,
    { parse_mode: "HTML", reply_markup: kb },
  );
}

async function placeOrder(ctx: Context) {
  const s = session(ctx.from!.id);
  if (!s.cart.length || !s.contacts.phone || !s.contacts.city) return showCart(ctx);

  const res = await fetch(`${BACKEND_URL}/api/orders/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: s.cart,
      address: s.contacts,
      telegram: { id: ctx.from!.id, username: ctx.from!.username },
    }),
  });
  if (!res.ok) {
    console.error("Shop: order failed", res.status, await res.text().catch(() => ""));
    // Most likely something sold out between browsing and checkout - refresh and let the
    // customer look at the cart again.
    catalogFetchedAt = 0;
    await ctx.reply("Не получилось оформить заказ — возможно, что-то из корзины закончилось. Проверьте корзину и попробуйте ещё раз.", {
      reply_markup: new InlineKeyboard().text("🧺 Корзина", "cart"),
    });
    return;
  }
  const order = (await res.json()) as { id: string };

  const text = orderText(s, `Здравствуйте! Мой заказ ${order.id} из Telegram-бота Nadeck:`, ctx.from?.username);
  if (MANAGER_CHAT_ID) {
    const userLink = ctx.from?.username ? "" : `\n<a href="tg://user?id=${ctx.from!.id}">Открыть чат с клиентом</a>`;
    await ctx.api
      .sendMessage(MANAGER_CHAT_ID, `🆕 ${esc(orderText(s, `Новый заказ ${order.id} (Telegram-бот)`, ctx.from?.username))}${userLink}`, { parse_mode: "HTML" })
      .catch((err) => console.error("Shop: failed to notify manager chat", err));
  }

  sessions.delete(ctx.from!.id);
  await ctx.reply(
    `✅ Заказ <b>${order.id}</b> оформлен!\n\nОсталось нажать кнопку ниже — откроется чат с менеджером, сообщение с заказом уже будет заполнено, просто отправьте его. Менеджер подтвердит заказ и подскажет, как оплатить.`,
    { parse_mode: "HTML", reply_markup: new InlineKeyboard().url("📨 Отправить заказ менеджеру", managerUrl(text)) },
  );
}

// --- wiring ----------------------------------------------------------------------------------

export const shop = new Composer<Context>();
const dm = shop.chatType("private");

dm.command(["start", "catalog"], async (ctx) => {
  const payload = ctx.match?.trim() || "";
  if (payload.startsWith("p_")) return showProduct(ctx, payload.slice(2));
  if (payload === "shop" || ctx.message?.text?.startsWith("/catalog")) return showCategories(ctx);
  await ctx.reply(
    "Привет! Я консультант Nadeck. Спросите что угодно о пептидах, дозировках и применении — или откройте каталог, чтобы выбрать и заказать товар.",
    { reply_markup: new InlineKeyboard().text("🛍 Каталог", "cat").text("🧺 Корзина", "cart") },
  );
});
dm.command("cart", showCart);

shop.callbackQuery("cat", async (ctx) => { await ctx.answerCallbackQuery(); await showCategories(ctx); });
shop.callbackQuery("cart", async (ctx) => { await ctx.answerCallbackQuery(); await showCart(ctx); });
shop.callbackQuery(/^c:(.+)$/, async (ctx) => { await ctx.answerCallbackQuery(); await showCategory(ctx, ctx.match[1]); });
shop.callbackQuery(/^p:(.+)$/, async (ctx) => { await ctx.answerCallbackQuery(); await showProduct(ctx, ctx.match[1]); });
shop.callbackQuery(/^v:([^:]+):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await showQuantity(ctx, ctx.match[1], Number(ctx.match[2]));
});
shop.callbackQuery(/^q:([^:]+):([^:]+):(\d+)$/, async (ctx) => {
  await loadCatalog();
  const p = findProduct(ctx.match[1]);
  const mg = Number(ctx.match[2]);
  const quantity = Number(ctx.match[3]);
  if (!p || !pricedVolumes(p).some((v) => v.mgPerUnit === mg)) {
    await ctx.answerCallbackQuery({ text: "Товар недоступен" });
    return showCategories(ctx);
  }
  const s = session(ctx.from.id);
  const existing = s.cart.find((i) => i.productId === p.id && i.mgPerUnit === mg);
  if (existing) existing.quantity += quantity;
  else s.cart.push({ productId: p.id, mgPerUnit: mg, quantity });
  await ctx.answerCallbackQuery({ text: "Добавлено в корзину" });
  await show(
    ctx,
    `✅ ${esc(shortName(p))}, ${packLabel(p, mg)} × ${quantity} — в корзине.`,
    new InlineKeyboard().text("✅ Оформить заказ", "co").row().text("🛍 Продолжить покупки", "cat").text(cartButtonLabel(s), "cart"),
  );
});
shop.callbackQuery(/^rm:(\d+)$/, async (ctx) => {
  session(ctx.from.id).cart.splice(Number(ctx.match[1]), 1);
  await ctx.answerCallbackQuery({ text: "Удалено" });
  await showCart(ctx);
});
shop.callbackQuery("co", async (ctx) => { await ctx.answerCallbackQuery(); await startCheckout(ctx); });
shop.callbackQuery(/^cc:([A-Z]{2})$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  session(ctx.from.id).contacts.country = ctx.match[1];
  await ask(ctx, "name");
});
shop.callbackQuery("ok", async (ctx) => {
  await ctx.answerCallbackQuery();
  await placeOrder(ctx);
});

dm.on("message:contact", async (ctx, next) => {
  const s = session(ctx.from.id);
  if (s.step !== "phone") return next();
  s.contacts.phone = ctx.message.contact.phone_number;
  await ask(ctx, "city");
});

// Checkout answers. Anything typed outside of checkout falls through to the AI advisor.
dm.on("message:text", async (ctx, next) => {
  const s = session(ctx.from.id);
  if (!s.step) return next();
  const value = ctx.message.text.trim().slice(0, 200);
  if (!value || value.startsWith("/")) return next();

  if (s.step === "name") {
    s.contacts.name = value;
    return ask(ctx, "phone");
  }
  if (s.step === "phone") {
    if (value.replace(/\D/g, "").length < 7) return ctx.reply("Похоже, это не номер телефона. Попробуйте ещё раз.");
    s.contacts.phone = value;
    return ask(ctx, "city");
  }
  if (s.step === "city") {
    s.contacts.city = value;
    return ask(ctx, "street");
  }
  s.contacts.street = value;
  await ctx.reply("Спасибо!", { reply_markup: { remove_keyboard: true } });
  await showSummary(ctx);
});

// Buttons attached under an advisor answer: one per catalog product the answer talks about,
// so a recommendation turns straight into a product card. In a group they're deep links into
// the private chat, since contacts and addresses shouldn't be typed in front of everyone.
export async function productButtons(answer: string, botUsername: string, inGroup: boolean): Promise<InlineKeyboard | undefined> {
  const { products } = await loadCatalog();
  const lower = answer.toLowerCase();
  const mentioned = products.filter((p) => aliases(p).some((a) => lower.includes(a))).slice(0, 4);

  if (inGroup) {
    if (!mentioned.length) return undefined;
    return InlineKeyboard.from(mentioned.map((p) => [InlineKeyboard.url(`🛒 ${shortName(p)}`, `https://t.me/${botUsername}?start=p_${shortKey(p.id)}`)]));
  }
  return InlineKeyboard.from([
    ...mentioned.map((p) => [InlineKeyboard.text(`🛒 ${shortName(p)}`, `p:${shortKey(p.id)}`)]),
    [InlineKeyboard.text("🛍 Каталог", "cat")],
  ]);
}

export function managerKeyboard(question: string): InlineKeyboard {
  return new InlineKeyboard().url("💬 Написать менеджеру", managerUrl(`Здравствуйте! ${question}`)).row().text("🛍 Каталог", "cat");
}
