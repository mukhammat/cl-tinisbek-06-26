/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';
import { PrismaService } from '../database/prisma.service';

interface FaqCard {
  question: string;
  answer: string;
}

// Catalog is fetched from the DB (admins add/edit/restock products through the admin panel),
// so it's refreshed on this interval instead of being cached for the lifetime of the process
// like the static FAQ below.
const CATALOG_CACHE_MS = 5 * 60 * 1000;

@Injectable()
export class ChatService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private openai: OpenAI | null = null;
  private knowledgeBase: string | null = null;
  private catalogText: string | null = null;
  private catalogFetchedAt = 0;

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
  // instead of only knowing about the peptides discussed in the FAQ transcripts.
  private async loadCatalog(): Promise<string> {
    const isStale = !this.catalogText || Date.now() - this.catalogFetchedAt > CATALOG_CACHE_MS;
    if (!isStale) return this.catalogText as string;

    try {
      const products = await this.prisma.product.findMany({
        include: { category: true, medicine: true, additionalGood: true },
      });

      this.catalogText = products
        .map((p) => {
          const name = (p.name as any)?.ru || p.id;
          const category = (p.category?.name as any)?.ru || p.categoryId;
          const typeLabel = p.type === 'peptide' ? 'пептид' : 'сопутствующий товар';
          const volumes: { price: number }[] = (p.medicine?.volumes as any) || (p.additionalGood?.volumes as any) || [];
          const prices = volumes.map((v) => Number(v.price)).filter((v) => Number.isFinite(v) && v > 0);
          const priceLabel = prices.length ? `от ${Math.min(...prices).toLocaleString('ru-RU')} тг` : 'цена по запросу';
          const stockLabel = p.inStock ? 'в наличии' : 'нет в наличии';
          const description = (p.description as any)?.ru || '';
          return `${name} — категория: ${category}, ${typeLabel}, ${priceLabel}, ${stockLabel}. ${description}`.trim();
        })
        .join('\n');
      this.catalogFetchedAt = Date.now();
    } catch (err) {
      console.error('Chat service: failed to load product catalog', err);
      // Keep serving the previous snapshot (or empty string on first failure) rather than
      // failing the whole chat request over a catalog refresh error.
      this.catalogText = this.catalogText || '';
    }

    return this.catalogText;
  }

  private async getSystemPrompt(): Promise<string> {
    const catalog = await this.loadCatalog();

    return `Ты — ассистент поддержки Nadeck. Отвечаешь пользователям сайта и Telegram-чатов на вопросы о пептидах, дозировках и протоколах применения, а также о любых других товарах каталога Nadeck (сопутствующие товары: шприцы, бактериостатическая вода, витамины, косметика, оборудование и т.д.) — их наличии, цене и назначении.

Ниже — два источника фактов. Используй оба, не ограничивайся точным совпадением формулировок — рассуждай как живой консультант, который оба знает наизусть. Если вопрос сформулирован иначе, чем в источниках, но по сути касается той же темы — свяжи его с релевантными записями и ответь по существу.

1) КАТАЛОГ ТОВАРОВ NADECK (актуальные позиции, категории, цены и наличие):
${catalog || '(каталог временно недоступен)'}

2) БАЗА ЗНАНИЙ NADECK (реальные вопросы и ответы из переписок с клиентами — протоколы, дозировки, побочные эффекты, комбинации):
${this.loadKnowledgeBase()}

ПРАВИЛА:
1. На вопросы о дозировках, разведении/смешивании (сколько воды на флакон, концентрация, мл/ЕД), схеме и частоте инъекций, длительности курса, хранении, побочных эффектах и противопоказаниях — отвечай прямо и конкретно теми цифрами, которые есть в базе знаний (мг, мл, ЕД, недели). Это основная ценность консультанта, не уклоняйся от таких вопросов и не отправляй к менеджеру, если ответ есть в базе.
2. На вопросы о том, какие товары есть в наличии, сколько стоят, к какой категории относятся — отвечай по каталогу выше. Если товара нет в каталоге или он отмечен «нет в наличии», так и скажи, не выдумывай наличие или цену.
3. Не придумывай конкретные цифры (дозировки, сроки, проценты, цены), которых нет ни в источниках выше, ни в надёжных общих знаниях — только в этом случае честно скажи, что нужно уточнить у менеджера/специалиста.
4. Если вопрос касается индивидуальной медицинской ситуации, которая выходит за рамки обычных случаев (сопутствующие заболевания, беременность, комбинации с рецептурными лекарствами, дети, острые симптомы и т.п.), дай конкретный ответ по базе (если он там есть), но дополнительно рекомендуй проконсультироваться с врачом — не вместо ответа, а в дополнение к нему.
5. Отвечай кратко и по делу, разговорным, но уважительным тоном на языке пользователя (русский, английский или арабский). Не используй markdown-заголовки.
6. Ты не заменяешь врача. Это справочная информация на основе базы знаний и каталога Nadeck, а не медицинская консультация.`;
  } 

  async processChat(body: any) {
    const { message, history } = body;

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: await this.getSystemPrompt() },
        ...(history || []).map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.text,
        })),
        { role: 'user', content: message },
      ];

      const completion = await this.getClient().chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.3,
      });

      return { reply: completion.choices[0]?.message?.content ?? '' };
    } catch (err) {
      console.error('Chat service error:', err);
      throw new InternalServerErrorException('AI service error occurred');
    }
  }
}
