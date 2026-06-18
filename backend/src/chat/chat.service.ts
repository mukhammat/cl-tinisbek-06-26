/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class ChatService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

  async processChat(body: any) {
    const { message, history } = body;
    if (!message) {
      return { reply: 'No message provided.' };
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return {
          reply: 'API key is not configured. Please add GEMINI_API_KEY to your environment/settings to enable the AI peptide consultant.'
        };
      }

      const systemInstruction = `You are a helpful and professional AI Peptide Advisor. You specialize in answering questions about peptides, antiaging, rejuvenation, muscle repair, weight loss, BPC-157, TB-500, Melanotan II, and Ipamorelin. Always provide safe, factual information, but include a legal caveat that your advice is for informational purposes and they should consult a physician. Align your response style and language with the language of the user's prompt (Russian, English, or Arabic).`;

      const contents: any[] = [];
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          const role = msg.role === 'assistant' ? 'model' : 'user';
          contents.push({
            role,
            parts: [{ text: msg.text || msg.content || '' }]
          });
        }
      }

      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
        }
      });

      const reply = response.text || 'Could you please rephrase?';
      return { reply };
    } catch (err: any) {
      console.error('Error in ChatService:', err);
      return {
        reply: 'Sorry, I am facing an issue processing your query right now. Please try again later.'
      };
    }
  }
}
