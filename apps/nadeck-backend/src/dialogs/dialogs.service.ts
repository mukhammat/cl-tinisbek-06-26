/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BadGatewayException, BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type DialogRole = 'customer' | 'bot' | 'operator';

export interface TelegramCustomer {
  id?: number | string;
  username?: string;
  name?: string;
}

// How long the advisor stays quiet after a manager writes (or takes the chat over). Every new
// manager reply restarts it, and "return to the bot" ends it early - so a chat the manager
// forgot about goes back to the bot on its own instead of leaving the customer unanswered.
const OPERATOR_HOLD_MS = 60 * 60 * 1000;

// Turns of stored history the advisor gets as context - same depth the bot used to keep in memory.
const HISTORY_MESSAGES = 20;

const MAX_REPLY_LENGTH = 4096; // Telegram's own limit for one message

// The Telegram bot's private chats, kept so the admin panel can show them and a manager can
// answer in the bot's place. ChatService writes both sides of every sales-mode exchange here;
// a manager's reply is sent from this service straight through the Bot API with the same
// token nadeck-bot uses, so the customer sees it as just another message from the bot.
@Injectable()
export class DialogsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // The dialog of this Telegram user (created on the first message), with the name refreshed
  // in case they've changed it since.
  async touch(customer: TelegramCustomer) {
    const telegramId = String(customer.id);
    const profile = { username: customer.username || null, name: String(customer.name || '').slice(0, 200) };
    return this.prisma.botDialog.upsert({
      where: { telegramId },
      create: { telegramId, ...profile },
      update: profile,
    });
  }

  isPaused(dialog: { pausedUntil: Date | null }): boolean {
    return !!dialog.pausedUntil && dialog.pausedUntil.getTime() > Date.now();
  }

  // The conversation so far in the shape ChatService feeds the model: everything the bot or a
  // manager said counts as the assistant's side, so the advisor picks up where the manager left off.
  async history(dialogId: string): Promise<{ role: 'user' | 'assistant'; text: string }[]> {
    const rows = await this.prisma.botDialogMessage.findMany({
      where: { dialogId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_MESSAGES,
    });
    return rows.reverse().map((m) => ({ role: m.role === 'customer' ? 'user' : 'assistant', text: m.text }));
  }

  async record(dialogId: string, role: DialogRole, text: string, orderId?: string) {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.botDialogMessage.create({ data: { dialogId, role, text, orderId: orderId || null, createdAt: now } }),
      this.prisma.botDialog.update({ where: { id: dialogId }, data: { lastMessageAt: now } }),
    ]);
  }

  // --- admin panel ---------------------------------------------------------------------------

  async list() {
    const dialogs = await this.prisma.botDialog.findMany({
      orderBy: { lastMessageAt: 'desc' },
      take: 200,
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    return dialogs.map(({ messages, ...d }) => ({ ...this.present(d), lastMessage: messages[0] ?? null }));
  }

  async get(id: string) {
    const dialog = await this.prisma.botDialog.findUnique({ where: { id } });
    if (!dialog) throw new NotFoundException('Dialog not found');
    const messages = await this.prisma.botDialogMessage.findMany({
      where: { dialogId: id },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    return { ...this.present(dialog), messages: messages.reverse() };
  }

  async reply(id: string, rawText: unknown) {
    const text = typeof rawText === 'string' ? rawText.trim() : '';
    if (!text) throw new BadRequestException('Message text is required');
    if (text.length > MAX_REPLY_LENGTH) throw new BadRequestException(`Message is longer than ${MAX_REPLY_LENGTH} characters`);

    const dialog = await this.prisma.botDialog.findUnique({ where: { id } });
    if (!dialog) throw new NotFoundException('Dialog not found');

    await this.sendTelegram(dialog.telegramId, text);
    await this.record(id, 'operator', text);
    return this.setPause(id, true);
  }

  async setPause(id: string, paused: boolean) {
    const dialog = await this.prisma.botDialog.update({
      where: { id },
      data: { pausedUntil: paused ? new Date(Date.now() + OPERATOR_HOLD_MS) : null },
    }).catch(() => {
      throw new NotFoundException('Dialog not found');
    });
    return this.present(dialog);
  }

  private present<T extends { pausedUntil: Date | null }>(dialog: T) {
    return { ...dialog, paused: this.isPaused(dialog) };
  }

  private async sendTelegram(chatId: string, text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new InternalServerErrorException('TELEGRAM_BOT_TOKEN is not configured');

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    }).catch((err) => {
      console.error('Dialogs: Telegram sendMessage failed', err);
      throw new BadGatewayException('Telegram is unreachable, try again');
    });
    if (!res.ok) {
      const body: any = await res.json().catch(() => ({}));
      // 403 = the customer blocked the bot; the manager has to know the message didn't arrive.
      throw new BadGatewayException(`Telegram: ${body?.description || res.status}`);
    }
  }
}
