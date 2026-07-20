/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Inject, Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async subscribe(email: string, medicineId: string) {
    if (!email || !medicineId) {
      throw new BadRequestException('Email and medicineId are required');
    }

    try {
      const medicine = await this.prisma.product.findUnique({ where: { id: medicineId } });
      if (!medicine) {
        throw new BadRequestException('Medicine not found');
      }
      if (medicine.inStock === 1) {
        return { success: true, alreadyInStock: true };
      }

      await this.prisma.stockSubscription.upsert({
        where: { email_medicineId: { email: email.toLowerCase(), medicineId } },
        update: { notified: 0 },
        create: {
          email: email.toLowerCase(),
          medicineId,
          notified: 0,
          createdAt: new Date().toISOString(),
        },
      });

      return { success: true, alreadyInStock: false };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      console.error('Subscribe error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async unsubscribe(email: string, medicineId: string) {
    try {
      await this.prisma.stockSubscription.deleteMany({
        where: { email: email.toLowerCase(), medicineId },
      });
      return { success: true };
    } catch (err) {
      console.error('Unsubscribe error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async getSubscriptions(email: string) {
    try {
      const rows = await this.prisma.stockSubscription.findMany({
        where: { email: email.toLowerCase(), notified: 0 },
      });
      return rows.map((r) => r.medicineId);
    } catch (err) {
      console.error('Get subscriptions error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async getForUser(email: string) {
    try {
      const rows = await this.prisma.notification.findMany({
        where: { email: email.toLowerCase() },
      });
      const reversed = [...rows].reverse();
      return reversed.map((n) => ({
        id: n.id,
        medicineId: n.medicineId,
        message: n.message,
        createdAt: n.createdAt,
        read: n.read === 1,
      }));
    } catch (err) {
      console.error('Get notifications error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async markRead(id: string) {
    try {
      await this.prisma.notification.update({
        where: { id },
        data: { read: 1 },
      });
      return { success: true };
    } catch (err) {
      console.error('Mark read error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async markAllRead(email: string) {
    try {
      await this.prisma.notification.updateMany({
        where: { email: email.toLowerCase(), read: 0 },
        data: { read: 1 },
      });
      return { success: true };
    } catch (err) {
      console.error('Mark all read error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  // Called when a product transitions from out-of-stock back to in-stock.
  async notifyRestock(medicineId: string, nameByLang: Record<string, string>) {
    try {
      const subs = await this.prisma.stockSubscription.findMany({
        where: { medicineId, notified: 0 },
      });
      if (subs.length === 0) return;

      const message = {
        ru: `Товар "${nameByLang.ru || nameByLang.en}" снова в наличии!`,
        en: `"${nameByLang.en || nameByLang.ru}" is back in stock!`,
        ar: `المنتج "${nameByLang.ar || nameByLang.en}" متوفر الآن من جديد!`,
      };

      for (const sub of subs) {
        await this.prisma.notification.create({
          data: {
            email: sub.email,
            medicineId,
            message,
            createdAt: new Date().toISOString(),
            read: 0,
          },
        });
      }

      await this.prisma.stockSubscription.updateMany({
        where: { medicineId, notified: 0 },
        data: { notified: 1 },
      });
    } catch (err) {
      console.error('Notify restock error:', err);
    }
  }
}
