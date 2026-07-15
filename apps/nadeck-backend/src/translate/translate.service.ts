/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class TranslateService {
  private openai: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
      this.openai = new OpenAI({ apiKey });
    }
    return this.openai;
  }

  private async translateJson(userPrompt: string): Promise<any> {
    try {
      const completion = await this.getClient().chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a precise medical/pharma translator for a peptide pharmacy admin panel. ' +
              'Translate the given Russian text into English and Arabic. Preserve tone, terminology, ' +
              'and formatting exactly. When a field is a newline-separated list, the translation must ' +
              'have the exact same number of lines, in the same order. Respond with strict JSON only, no commentary.',
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      return JSON.parse(raw);
    } catch (err) {
      console.error('Translate service error:', err);
      throw new InternalServerErrorException('AI translation failed');
    }
  }

  async translateCategory(body: any) {
    const name = String(body?.name || '').trim();
    if (!name) {
      throw new BadRequestException('Name is required');
    }

    const result = await this.translateJson(
      `Translate this pharmacy product category name from Russian into English and Arabic.\n` +
        `Return JSON exactly like: {"en": "...", "ar": "..."}\n\n` +
        `Russian: ${name}`
    );

    return {
      en: String(result?.en || '').trim(),
      ar: String(result?.ar || '').trim(),
    };
  }

  async translateMedicine(body: any) {
    const { name, activeSubstance, description, fullDescription, usage, indications, contraindications } = body || {};

    if (!String(name || '').trim()) {
      throw new BadRequestException('Name is required');
    }

    const fields = {
      name: name || '',
      activeSubstance: activeSubstance || '',
      description: description || '',
      fullDescription: fullDescription || '',
      usage: usage || '',
      indications: indications || '',
      contraindications: contraindications || '',
    };

    const result = await this.translateJson(
      `Translate the following pharmacy product fields from Russian into English and Arabic.\n` +
        `"indications" and "contraindications" are newline-separated lists - the translation must keep ` +
        `the exact same number of lines, in the same order, still separated by newlines.\n` +
        `Return strict JSON with exactly this shape:\n` +
        `{"en": {"name":"","activeSubstance":"","description":"","fullDescription":"","usage":"","indications":"","contraindications":""}, ` +
        `"ar": {"name":"","activeSubstance":"","description":"","fullDescription":"","usage":"","indications":"","contraindications":""}}\n\n` +
        `Russian fields (JSON):\n${JSON.stringify(fields)}`
    );

    const pick = (lang: 'en' | 'ar') => ({
      name: String(result?.[lang]?.name || '').trim(),
      activeSubstance: String(result?.[lang]?.activeSubstance || '').trim(),
      description: String(result?.[lang]?.description || '').trim(),
      fullDescription: String(result?.[lang]?.fullDescription || '').trim(),
      usage: String(result?.[lang]?.usage || '').trim(),
      indications: String(result?.[lang]?.indications || '').trim(),
      contraindications: String(result?.[lang]?.contraindications || '').trim(),
    });

    return { en: pick('en'), ar: pick('ar') };
  }
}
