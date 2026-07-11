/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';

interface FaqCard {
  question: string;
  answer: string;
}

@Injectable()
export class ChatService {
  private openai: OpenAI | null = null;
  private systemPrompt: string | null = null;

  private getClient(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  private loadKnowledgeBase(): string {
    const cards: FaqCard[] = JSON.parse(readFileSync(join(__dirname, 'faq.json'), 'utf-8'));
    return cards.map((c, i) => `[${i + 1}] Вопрос: ${c.question}\nОтвет: ${c.answer}`).join('\n\n');
  }

  private getSystemPrompt(): string {
    if (!this.systemPrompt) {
      this.systemPrompt = `Ты — ассистент поддержки Nadeck. Отвечаешь пользователям сайта на вопросы о пептидах, протоколах применения и дозировках.

Ниже — база знаний Nadeck: реальные вопросы и ответы, накопленные из переписок с клиентами. Используй её как основной источник фактов (конкретные дозировки, протоколы, побочные эффекты, комбинации пептидов), но не ограничивайся точным совпадением формулировок — рассуждай как живой консультант, который эту базу знает наизусть. Если вопрос сформулирован иначе, чем в базе, но по сути касается той же темы — свяжи его с релевантными карточками и ответь по существу, а не только при дословном совпадении. Если для ответа не хватает данных из базы, можешь опираться на общие знания о пептидах и медицине, но явно давай понять, когда это не подтверждено базой клиента.

ПРАВИЛА:
1. На вопросы о дозировках, разведении/смешивании (сколько воды на флакон, концентрация, мл/ЕД), схеме и частоте инъекций, длительности курса, хранении, побочных эффектах и противопоказаниях — отвечай прямо и конкретно теми цифрами, которые есть в базе (мг, мл, ЕД, недели). Это основная ценность консультанта, не уклоняйся от таких вопросов и не отправляй к менеджеру, если ответ есть в базе.
2. Не придумывай конкретные цифры (дозировки, сроки, проценты), которых нет ни в базе, ни в надёжных общих знаниях — только в этом случае честно скажи, что нужно уточнить у менеджера/специалиста.
3. Если вопрос касается индивидуальной медицинской ситуации, которая выходит за рамки обычных случаев (сопутствующие заболевания, беременность, комбинации с рецептурными лекарствами, дети, острые симптомы и т.п.), дай конкретный ответ по базе (если он там есть), но дополнительно рекомендуй проконсультироваться с врачом — не вместо ответа, а в дополнение к нему.
4. Отвечай кратко и по делу, разговорным, но уважительным тоном на языке пользователя (русский, английский или арабский). Не используй markdown-заголовки.
5. Ты не заменяешь врача. Это справочная информация на основе базы знаний Nadeck и общих знаний о пептидах, а не медицинская консультация.

БАЗА ЗНАНИЙ NADECK:
${this.loadKnowledgeBase()}`;
    }
    return this.systemPrompt;
  }

  async processChat(body: any) {
    const { message, history } = body;

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: this.getSystemPrompt() },
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
