/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import OpenAI, { toFile } from 'openai';
import { PrismaService } from '../database/prisma.service';
import { OrdersService } from '../orders/orders.service';

interface FaqCard {
  question: string;
  answer: string;
}

// Catalog is fetched from the DB (admins add/edit/restock products through the admin panel),
// so it's refreshed on this interval instead of being cached for the lifetime of the process
// like the static FAQ below.
const CATALOG_CACHE_MS = 5 * 60 * 1000;

// Model outputs this exact token instead of an answer when it has no reliable info - callers
// (frontend widget, Telegram bot) translate that into staying silent, not "I don't know".
const NO_ANSWER_TOKEN = 'NO_REPLY';

const UNIT_LABELS: Record<string, string> = { mg: 'мг', ml: 'мл', pcs: 'шт' };

// Sales mode (the Telegram bot's private chat) lets the model place the order itself once the
// customer has confirmed it. Only ids, pack sizes and quantities come from the model - prices
// are looked up by OrdersService, so a hallucinated figure can never reach the order.
const PLACE_ORDER_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'place_order',
    description: 'Оформить заказ. Вызывай только после того, как клиент явно подтвердил итоговый состав заказа и свои данные.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string', description: 'id товара из каталога (значение в квадратных скобках)' },
              mgPerUnit: { type: 'number', description: 'фасовка — число из списка фасовок этого товара' },
              quantity: { type: 'integer', minimum: 1 },
            },
            required: ['productId', 'mgPerUnit', 'quantity'],
          },
        },
        name: { type: 'string', description: 'имя клиента' },
        phone: { type: 'string', description: 'телефон клиента' },
        country: { type: 'string', description: 'код страны доставки из списка стран, например KZ' },
        city: { type: 'string' },
        street: { type: 'string', description: 'улица, дом, квартира' },
      },
      required: ['items', 'name', 'phone', 'city', 'street'],
    },
  },
};

// Lets the model show product photos in the Telegram chat - it can't send images itself, so it
// names the products and the bot delivers their gallery covers next to the reply.
const SEND_PHOTOS_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'send_product_photos',
    description: 'Показать клиенту фото товаров — фото отправятся в чат вместе с твоим ответом.',
    parameters: {
      type: 'object',
      properties: {
        productIds: { type: 'array', items: { type: 'string' }, maxItems: 3, description: 'id товаров из каталога для продажи' },
      },
      required: ['productIds'],
    },
  },
};

// Tool round-trips per message: e.g. photos first, then the final answer. Bounded so a model
// that keeps calling tools can't loop forever.
const MAX_TOOL_ROUNDS = 3;

// Known to work with everything below (tools, temperature). If OPENAI_CHAT_MODEL names a model
// the API rejects - unknown id, no tool calling on Chat Completions, no temperature - the
// advisor falls back to this one instead of failing the customer's chat.
const FALLBACK_MODEL = 'gpt-4o-mini';

type Photo = { url: string; caption: string };

// What every peptide vial ships with at no extra cost. One shop-wide rule rather than a line in
// each product's description, so a new peptide gets it too.
const PEPTIDE_KIT = 'бактериостатическая вода, 5 инсулиновых шприцев, 1 шприц для разведения и спиртовые салфетки';

@Injectable()
export class ChatService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrdersService) private readonly orders: OrdersService,
  ) {}

  private openai: OpenAI | null = null;
  private knowledgeBase: string | null = null;
  private catalogText: string | null = null;
  private salesCatalogText: string | null = null;
  private catalogFetchedAt = 0;
  // Set once the configured model has been rejected, so later messages don't pay for a failed
  // request first. Cleared by a restart (i.e. the next deploy).
  private configuredModelRejected = false;

  private getClient(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  private loadKnowledgeBase(): string {
    if (!this.knowledgeBase) {
      const cards: FaqCard[] = JSON.parse(readFileSync(join(__dirname, 'faq.json'), 'utf-8'));
      this.knowledgeBase = cards.map((c, i) => `[${i + 1}] Вопрос: ${c.question}\nОтвет: ${c.answer}`).join('\n\n');
    }
    return this.knowledgeBase;
  }

  // Builds a compact one-line-per-product summary of the live catalog (peptides and
  // everything else Nadeck sells — syringes, water, vitamins, cosmetics, equipment) so the
  // assistant can answer "what do you have / how much / is it in stock" questions accurately
  // instead of only knowing about the peptides discussed in the FAQ transcripts. The sales
  // variant also carries ids and every pack size, which the place_order tool needs; it's kept
  // out of the website widget's prompt so ids never leak into its answers.
  private async loadCatalog(): Promise<{ catalog: string; sales: string }> {
    const isStale = this.catalogText === null || Date.now() - this.catalogFetchedAt > CATALOG_CACHE_MS;
    if (!isStale) return { catalog: this.catalogText as string, sales: this.salesCatalogText as string };

    try {
      const [products, countries] = await Promise.all([
        this.prisma.product.findMany({ include: { category: true, medicine: true, additionalGood: true } }),
        this.prisma.deliveryCountry.findMany({ where: { isActive: true, markets: { has: 'main' } } }),
      ]);

      const lines = products.map((p) => {
        const name = (p.name as any)?.ru || p.id;
        const category = (p.category?.name as any)?.ru || p.categoryId;
        const typeLabel = p.type === 'peptide' ? 'пептид' : 'сопутствующий товар';
        const volumes: { mgPerUnit: number; price: number }[] = (p.medicine?.volumes as any) || (p.additionalGood?.volumes as any) || [];
        const priced = volumes.filter((v) => Number.isFinite(Number(v.price)) && Number(v.price) > 0);
        const priceLabel = priced.length ? `от ${Math.min(...priced.map((v) => Number(v.price))).toLocaleString('ru-RU')} тг` : 'цена по запросу';
        const stockLabel = p.inStock ? 'в наличии' : 'нет в наличии';
        const description = (p.description as any)?.ru || '';
        const unit = UNIT_LABELS[p.unit] || '';
        const packs = priced.length
          ? priced.map((v) => `${v.mgPerUnit} ${unit} — ${Number(v.price).toLocaleString('ru-RU')} тг`).join('; ')
          : 'цена по запросу, заказ только через менеджера';
        const sellable = p.inStock && p.markets.includes('main');
        const kit = p.type === 'peptide' ? ` В комплекте с каждым флаконом бесплатно: ${PEPTIDE_KIT}.` : '';
        return {
          catalog: `${name} — категория: ${category}, ${typeLabel}, ${priceLabel}, ${stockLabel}.${kit} ${description}`.trim(),
          sales: sellable ? `[${p.id}] ${name} — ${category}, ${typeLabel}. Фасовки: ${packs}.${kit} ${description}`.trim() : null,
        };
      });

      const delivery = countries.length
        ? countries.map((c) => `${c.code} — ${(c.name as any)?.ru || c.code}, доставка ${c.priceKzt.toLocaleString('ru-RU')} тг`).join('\n')
        : 'Страны доставки не настроены — стоимость доставки уточнит менеджер, поле country не передавай.';

      this.catalogText = lines.map((l) => l.catalog).join('\n');
      this.salesCatalogText = `${lines.flatMap((l) => (l.sales ? [l.sales] : [])).join('\n')}\n\nСТРАНЫ ДОСТАВКИ:\n${delivery}`;
      this.catalogFetchedAt = Date.now();
    } catch (err) {
      console.error('Chat service: failed to load product catalog', err);
      // Keep serving the previous snapshot (or empty string on first failure) rather than
      // failing the whole chat request over a catalog refresh error.
      this.catalogText = this.catalogText || '';
      this.salesCatalogText = this.salesCatalogText || '';
    }

    return { catalog: this.catalogText as string, sales: this.salesCatalogText as string };
  }

  private async getSystemPrompt(sales: boolean): Promise<string> {
    const { catalog, sales: salesCatalog } = await this.loadCatalog();

    const unknownRule = sales
      ? `3. Не придумывай конкретные цифры (дозировки, сроки, проценты, цены) и вообще ничего, чего нет ни в источниках выше, ни в надёжных общих знаниях. Если точного ответа нет — честно скажи, что это уточнит менеджер после оформления заказа, и продолжай разговор.`
      : `3. Не придумывай конкретные цифры (дозировки, сроки, проценты, цены) и вообще ничего, чего нет ни в источниках выше, ни в надёжных общих знаниях. В этом случае НЕ пиши «не знаю», «уточню у менеджера» и подобное — вместо ответа выведи только служебный токен ${NO_ANSWER_TOKEN}, без каких-либо других слов, знаков препинания или пояснений.`;

    const salesBlock = sales
      ? `

ТЫ ТАКЖЕ ПРОДАВЕЦ-КОНСУЛЬТАНТ. Это личный чат с клиентом в Telegram — общайся как живой внимательный менеджер магазина, а не как анкета: коротко, тепло, по одному-два вопроса за раз, без списков вопросов подряд.
- Узнай, какая у клиента цель или задача, и предложи подходящие товары из каталога для продажи ниже. Расскажи, для чего применяется товар, назначение, важные противопоказания — опираясь на базу знаний и описание. К каждому флакону пептида бесплатно идёт комплект (${PEPTIDE_KIT}) — говори об этом, когда предлагаешь пептид, и не продавай к нему воду и шприцы отдельно. Сопутствующие товары оформляй, только если клиент сам хочет докупить сверх комплекта.
- Твоя задача — помочь клиенту выбрать и купить. Не отговаривай от покупки: не пиши «не советую», «не начинайте», «сначала обследуйтесь, потом решайте» и не заканчивай ответ сомнениями. Не рассуждай о регистрации или правовом статусе товаров, если клиент сам об этом не спросил, и не пиши, что у Nadeck нет врача. Противопоказания называй спокойно и по делу, а совет обратиться к врачу давай только при противопоказаниях, хронических болезнях, беременности и т.п. — одной фразой. Заканчивай ответ предложением помочь: подобрать фасовку, показать фото или оформить заказ.
- Цены называй только из каталога для продажи, в тенге. Товар без цены или которого нет в каталоге для продажи — предложи обсудить с менеджером, не оформляй его.
- Когда клиент решил купить, уточни фасовку и количество, затем собери: имя, телефон, страну (если стран доставки несколько), город, адрес (улица, дом, квартира). Спрашивай естественно, в ходе разговора.
- Перед оформлением коротко повтори заказ: товары с фасовками и количеством, сумма за товары, доставка, итог, данные клиента — и спроси подтверждение. Только после явного «да» вызови place_order.
- После оформления сообщи номер заказа и что менеджер свяжется с клиентом для подтверждения и оплаты. Оплату сам не принимай и реквизиты не придумывай.
- Ты можешь показывать фото товаров: вызови send_product_photos, когда клиент просит фото или хочет посмотреть товар, а также когда предлагаешь клиенту один-два конкретных товара к покупке. Никогда не говори, что не можешь показать фото. Фото прикрепляются к сообщению сами — не вставляй в текст ссылки на изображения и разметку вроде ![...](...), просто пиши ответ.
- Пиши простым текстом, без markdown (никаких **, __, #) — Telegram показывает эти символы как есть.

КАТАЛОГ ДЛЯ ПРОДАЖИ (в квадратных скобках — id товара для place_order; только эти товары можно оформить):
${salesCatalog || '(каталог временно недоступен — предложи связаться с менеджером)'}`
      : '';

    return `Ты — ассистент поддержки Nadeck. Отвечаешь пользователям сайта и Telegram-чатов на вопросы о пептидах, дозировках и протоколах применения, а также о любых других товарах каталога Nadeck (сопутствующие товары: шприцы, бактериостатическая вода, витамины, косметика, оборудование и т.д.) — их наличии, цене и назначении.

Ниже — два источника фактов. Используй оба, не ограничивайся точным совпадением формулировок — рассуждай как живой консультант, который оба знает наизусть. Если вопрос сформулирован иначе, чем в источниках, но по сути касается той же темы — свяжи его с релевантными записями и ответь по существу.

1) КАТАЛОГ ТОВАРОВ NADECK (актуальные позиции, категории, цены и наличие):
${catalog || '(каталог временно недоступен)'}

2) БАЗА ЗНАНИЙ NADECK (реальные вопросы и ответы из переписок с клиентами — протоколы, дозировки, побочные эффекты, комбинации):
${this.loadKnowledgeBase()}

ПРАВИЛА:
1. На вопросы о дозировках, разведении/смешивании (сколько воды на флакон, концентрация, мл/ЕД), схеме и частоте инъекций, длительности курса, хранении, побочных эффектах и противопоказаниях — отвечай прямо и конкретно теми цифрами, которые есть в базе знаний (мг, мл, ЕД, недели). Это основная ценность консультанта, не уклоняйся от таких вопросов и не отправляй к менеджеру, если ответ есть в базе.
2. На вопросы о том, какие товары есть в наличии, сколько стоят, к какой категории относятся — отвечай по каталогу выше. Если товара нет в каталоге или он отмечен «нет в наличии», так и скажи, не выдумывай наличие или цену.
${unknownRule}
4. Если вопрос касается индивидуальной медицинской ситуации, которая выходит за рамки обычных случаев (сопутствующие заболевания, беременность, комбинации с рецептурными лекарствами, дети, острые симптомы и т.п.), дай конкретный ответ по базе (если он там есть), но дополнительно рекомендуй проконсультироваться с врачом — не вместо ответа, а в дополнение к нему.
5. Отвечай кратко и по делу, разговорным, но уважительным тоном на языке пользователя (русский, казахский, английский или арабский). Определяй язык по последнему сообщению пользователя и веди на нём весь ответ целиком — источники фактов выше на русском, но это не повод переключаться на русский посреди ответа: переводи факты на язык пользователя, а не копируй формулировки как есть. Никогда не смешивай два языка в одном ответе. Не используй markdown-заголовки.
6. Ты не заменяешь врача. Это справочная информация на основе базы знаний и каталога Nadeck, а не медицинская консультация.${salesBlock}`;
  }

  // Speech-to-text for the Telegram bot's voice messages - the bot has no OpenAI client of its
  // own, so it posts the audio here and then sends the text to /api/chat like a typed message.
  async transcribe(file: { buffer: Buffer; originalname?: string; mimetype?: string } | undefined) {
    if (!file?.buffer?.length) throw new BadRequestException('Audio file is required');
    try {
      const result = await this.getClient().audio.transcriptions.create({
        // Telegram names voice notes *.oga, which OpenAI rejects by extension - it's the same Ogg.
        file: await toFile(file.buffer, (file.originalname || 'voice.ogg').replace(/\.oga$/i, '.ogg'), { type: file.mimetype || 'audio/ogg' }),
        model: process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-transcribe',
      });
      return { text: result.text?.trim() ?? '' };
    } catch (err) {
      console.error('Chat transcription error:', err);
      throw new InternalServerErrorException('Transcription failed');
    }
  }

  // body.mode === 'sales' is sent only by the Telegram bot's private chat, together with
  // body.customer ({ id, username }) - the website widget keeps the plain Q&A behaviour.
  async processChat(body: any) {
    const { message, history, mode, customer } = body;
    const sales = mode === 'sales';

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: await this.getSystemPrompt(sales) },
        ...(history || []).map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.text,
        })),
        { role: 'user', content: message },
      ];

      const request = (model: string) =>
        this.getClient().chat.completions.create({
          model,
          messages,
          // Newer (reasoning) models reject a custom temperature, and only take function tools on
          // Chat Completions with reasoning switched off - which also keeps replies quick.
          ...(model.startsWith('gpt-4') ? { temperature: 0.3 } : { reasoning_effort: 'none' as any }),
          ...(sales ? { tools: [PLACE_ORDER_TOOL, SEND_PHOTOS_TOOL] } : {}),
        });

      const complete = async () => {
        const configured = process.env.OPENAI_CHAT_MODEL || FALLBACK_MODEL;
        if (configured === FALLBACK_MODEL || this.configuredModelRejected) return request(FALLBACK_MODEL);
        try {
          return await request(configured);
        } catch (err: any) {
          if (err?.status !== 400 && err?.status !== 404) throw err;
          console.error(`Chat model ${configured} rejected (${err.message}), falling back to ${FALLBACK_MODEL}`);
          this.configuredModelRejected = true;
          return request(FALLBACK_MODEL);
        }
      };

      let completion = await complete();
      let order: any = null;
      const photos: Photo[] = [];

      for (let round = 0; sales && round < MAX_TOOL_ROUNDS; round++) {
        const toolCalls = completion.choices[0]?.message?.tool_calls;
        if (!toolCalls?.length) break;
        messages.push(completion.choices[0].message);
        for (const call of toolCalls) {
          let forModel: any;
          if (call.function.name === 'send_product_photos') {
            const found = await this.findPhotos(call.function.arguments);
            photos.push(...found.filter((p) => !photos.some((x) => x.url === p.url)));
            forModel = found.length ? { ok: true, sent: found.length } : { ok: false, error: 'У этих товаров нет фото' };
          } else {
            const result = await this.runPlaceOrder(call.function.arguments, customer);
            if (result.order) order = result.order;
            forModel = result.forModel;
          }
          messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(forModel) });
        }
        completion = await complete();
      }

      const content = completion.choices[0]?.message?.content ?? '';
      const reply = content.trim() === NO_ANSWER_TOKEN ? '' : content;
      return { reply, model: completion.model, ...(order ? { order } : {}), ...(photos.length ? { photos: photos.slice(0, 10) } : {}) };
    } catch (err) {
      console.error('Chat service error:', err);
      throw new InternalServerErrorException('AI service error occurred');
    }
  }

  // Cover photo of each requested product, as nadeck.net shows it (its own gallery, else the
  // ar.nadeck.net one - same fallback as MedicinesService).
  private async findPhotos(rawArgs: string): Promise<Photo[]> {
    try {
      const ids: string[] = (JSON.parse(rawArgs || '{}').productIds || []).map(String).slice(0, 3);
      const products = await this.prisma.product.findMany({ where: { id: { in: ids } } });
      return products.flatMap((p) => {
        const gallery = [p.images, p.imagesAr].find((g) => Array.isArray(g) && g.length) as string[] | undefined;
        const name = String((p.name as any)?.ru || p.id).split(/\s+—\s+/)[0].trim();
        return gallery?.[0] ? [{ url: gallery[0], caption: name }] : [];
      });
    } catch (err) {
      console.error('Chat send_product_photos failed:', err);
      return [];
    }
  }

  // A rejected order (sold out, wrong pack size, missing phone) goes back to the model as the
  // tool result, so it can tell the customer what to fix instead of the whole chat failing.
  private async runPlaceOrder(rawArgs: string, customer: any): Promise<{ order?: any; forModel: any }> {
    try {
      const args = JSON.parse(rawArgs || '{}');
      const order = await this.orders.placeTelegramOrder({
        items: args.items,
        address: { country: args.country, city: args.city, street: args.street, name: args.name, phone: args.phone },
        telegram: { id: customer?.id, username: customer?.username },
      });
      return {
        order,
        forModel: { ok: true, orderId: order.id, subtotal: order.subtotal, delivery: order.delivery, total: order.totalPrice },
      };
    } catch (err) {
      const reason = err instanceof BadRequestException ? err.message : 'Внутренняя ошибка, предложи клиенту написать менеджеру';
      if (!(err instanceof BadRequestException)) console.error('Chat place_order failed:', err);
      return { forModel: { ok: false, error: reason } };
    }
  }
}
