/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// Everyone the shop knows about, for the admin panel's "Users" tab - not only registered
// accounts. Orders aren't tied to accounts by a relation, only by Order.userEmail, which holds
// one of three things:
//   - an account's email                    -> kind 'account'
//   - "tg:@username" / "tg:<telegram id>"  -> kind 'telegram' (bot sale, no account behind it)
//   - "guest" or an email nobody registered -> kind 'guest' (site checkout without signing in)
// Telegram customers who only talked to the bot come from BotDialog, so they show up too.

export type PersonKind = 'account' | 'telegram' | 'guest';

export interface PersonOrder {
  id: string;
  date: string;
  status: string;
  totalPrice: number;
  totalPriceUsd: number;
  items: { name: Record<string, string>; quantity: number }[];
  promoCode: string | null;
}

export interface Person {
  key: string;
  kind: PersonKind;
  email: string | null;
  name: string;
  phone: string;
  address: string;
  emailVerified: boolean | null; // null = not an account
  isAdmin: boolean;
  registeredAt: string | null; // accounts only; null for ones created before it was recorded
  telegram: { username: string | null; telegramId: string | null } | null;
  firstSeenAt: string | null; // Telegram: when they first wrote to the bot
  lastActivityAt: string | null; // Telegram: last message to the bot
  orders: PersonOrder[];
  ordersCount: number;
  totalKzt: number;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list() {
    try {
      const [users, orders, dialogs] = await Promise.all([
        this.prisma.user.findMany(),
        this.prisma.order.findMany(),
        this.prisma.botDialog.findMany({ select: { telegramId: true, username: true, name: true, createdAt: true, lastMessageAt: true } }),
      ]);

      const people = new Map<string, Person>();
      const blank = (key: string, kind: PersonKind): Person => ({
        key, kind, email: null, name: '', phone: '', address: '', emailVerified: null, isAdmin: false,
        registeredAt: null, telegram: null, firstSeenAt: null, lastActivityAt: null, orders: [], ordersCount: 0, totalKzt: 0,
      });

      for (const u of users) {
        people.set(u.email, {
          ...blank(u.email, 'account'),
          email: u.email,
          name: u.fullName,
          phone: u.phone,
          address: u.address,
          emailVerified: u.emailVerified,
          isAdmin: u.isAdmin,
          registeredAt: u.createdAt ? u.createdAt.toISOString() : null,
        });
      }

      // Bot sales are stored under "tg:@username" when the customer has a username, else under
      // "tg:<id>" - key the dialogs the same way so a chat and its orders land on one row.
      for (const d of dialogs) {
        const key = d.username ? `tg:@${d.username.toLowerCase()}` : `tg:${d.telegramId}`;
        people.set(key, {
          ...blank(key, 'telegram'),
          name: d.name,
          telegram: { username: d.username, telegramId: d.telegramId },
          firstSeenAt: d.createdAt.toISOString(),
          lastActivityAt: d.lastMessageAt.toISOString(),
        });
      }

      // Orders have no timestamp column; they come back in insertion order (getAdminOrders relies
      // on the same), so after the unshift below each person's newest order is on top and the
      // contact details taken from orders are the most recent ones.
      for (const o of orders) {
        const raw = o.userEmail.trim();
        const isTelegram = raw.startsWith('tg:');
        const key = isTelegram ? raw.toLowerCase() : raw.toLowerCase() || 'guest';
        let person = people.get(key);
        if (!person) {
          person = blank(key, isTelegram ? 'telegram' : 'guest');
          if (isTelegram) {
            const handle = raw.slice(3);
            person.telegram = handle.startsWith('@')
              ? { username: handle.slice(1), telegramId: null }
              : { username: null, telegramId: handle };
          } else if (key !== 'guest') {
            person.email = raw;
          }
          people.set(key, person);
        }

        const address = (o.address ?? {}) as Record<string, unknown>;
        if (person.kind !== 'account') {
          person.name = text(address.name) || person.name;
          person.phone = text(address.phone) || person.phone;
        }
        if (!person.address) {
          person.address = [address.city, address.street, address.apartment].map(text).filter(Boolean).join(', ');
        }

        const items = Array.isArray(o.items) ? (o.items as any[]) : [];
        person.orders.unshift({
          id: o.id,
          date: o.date,
          status: o.status,
          totalPrice: o.totalPrice,
          totalPriceUsd: o.totalPriceUsd,
          items: items.map((i) => ({
            name: typeof i?.medicineName === 'object' && i.medicineName ? i.medicineName : { ru: String(i?.medicineName ?? ''), en: String(i?.medicineName ?? '') },
            quantity: Number(i?.quantity) || 1,
          })),
          promoCode: o.promoCode,
        });
        person.ordersCount += 1;
        person.totalKzt += o.totalPrice;
      }

      const list = [...people.values()].map((p) => ({ ...p, totalKzt: Math.round(p.totalKzt * 100) / 100 }));
      const accounts = list.filter((p) => p.kind === 'account');

      return {
        people: list,
        totals: {
          accounts: accounts.length,
          verified: accounts.filter((p) => p.emailVerified).length,
          accountsWithOrders: accounts.filter((p) => p.ordersCount > 0).length,
          telegram: list.filter((p) => p.kind === 'telegram').length,
          guestOrders: list.filter((p) => p.kind === 'guest').reduce((sum, p) => sum + p.ordersCount, 0),
        },
      };
    } catch (err) {
      console.error('List users error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }
}
