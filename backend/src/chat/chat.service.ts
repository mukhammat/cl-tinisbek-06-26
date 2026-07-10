import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class ChatService {
  private ai: GoogleGenAI | null = null;

  private getAI(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new InternalServerErrorException('GEMINI_API_KEY is not configured');
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
  }

  async processChat(body: any) {
    const { message, history } = body;

    try {
      const contents = [
        ...(history || []).map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.text }],
        })),
        { role: 'user', parts: [{ text: message }] },
      ];

      const response = await this.getAI().models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
        config: {
          systemInstruction:
            'You are a professional peptide and pharmaceutical advisor. Help users understand medicines, peptides, dosages, and usage guidelines. Be concise, accurate, and always recommend consulting a healthcare professional for medical decisions.',
        },
      });

      return { reply: response.text ?? '' };
    } catch (err) {
      console.error('Chat service error:', err);
      throw new InternalServerErrorException('AI service error occurred');
    }
  }
}
