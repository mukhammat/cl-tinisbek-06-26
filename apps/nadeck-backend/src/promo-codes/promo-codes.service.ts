/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Inject, Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// Why a code can't be used right now. The frontend maps these to localized text instead of
// showing a server-side message, so the wording stays in one place per language.
export type PromoRejection = 'not_found' | 'inactive' | 'expired' | 'exhausted';

export interface ResolvedPromo {
  code: string;
  discountPercent: number;
  partnerName: string;
}

const CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;

@Injectable()
export class PromoCodesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Codes are case-insensitive for the customer typing them in, canonical uppercase in storage.
  private normalize(code: unknown): string {
    return String(code || '').trim().toUpperCase();
  }

  /**
   * Resolve a code the customer typed. Returns the usable discount, or the reason it can't be
   * used - callers decide whether a rejection is an error (checkout) or just a message (the
   * cart's "apply" button).
   */
  async resolve(rawCode: unknown): Promise<{ promo: ResolvedPromo } | { rejection: PromoRejection }> {
    const code = this.normalize(rawCode);
    if (!code) return { rejection: 'not_found' };

    const promo = await this.prisma.promoCode.findUnique({ where: { code } });
    if (!promo) return { rejection: 'not_found' };
    if (!promo.isActive) return { rejection: 'inactive' };
    if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) return { rejection: 'expired' };

    if (promo.maxUses !== null && promo.maxUses !== undefined) {
      const used = await this.prisma.order.count({ where: { promoCode: code } });
      if (used >= promo.maxUses) return { rejection: 'exhausted' };
    }

    return { promo: { code: promo.code, discountPercent: promo.discountPercent, partnerName: promo.partnerName } };
  }

  // Public endpoint behind the cart's "apply" button. Always 200 - an unknown code is a normal
  // outcome for the shopper, not an error worth a red toast.
  async validate(rawCode: unknown) {
    const result = await this.resolve(rawCode);
    if ('rejection' in result) {
      return { valid: false as const, reason: result.rejection };
    }
    return { valid: true as const, ...result.promo };
  }

  // ----- admin -----

  /**
   * Every code with the numbers the partner is judged on. Usage is counted from Order.promoCode
   * rather than a counter column, so it stays correct no matter how orders were created.
   */
  async listWithStats() {
    try {
      const [codes, orders] = await Promise.all([
        this.prisma.promoCode.findMany(),
        this.prisma.order.findMany({
          where: { promoCode: { not: null } },
          select: { promoCode: true, userEmail: true, totalPrice: true, totalPriceUsd: true, totalPriceSar: true, discountKzt: true },
        }),
      ]);

      const byCode = new Map<string, typeof orders>();
      for (const order of orders) {
        const key = order.promoCode as string;
        const bucket = byCode.get(key);
        if (bucket) bucket.push(order);
        else byCode.set(key, [order]);
      }

      const rows = codes.map((promo) => {
        const used = byCode.get(promo.code) || [];
        // Guest checkouts all share the "guest" email, so they can't be deduplicated - each
        // guest order counts as its own customer, which is the closest honest answer.
        const namedEmails = new Set(used.filter((o) => o.userEmail !== 'guest').map((o) => o.userEmail));
        const guestOrders = used.filter((o) => o.userEmail === 'guest').length;

        return {
          code: promo.code,
          partnerName: promo.partnerName,
          discountPercent: promo.discountPercent,
          isActive: promo.isActive,
          maxUses: promo.maxUses,
          expiresAt: promo.expiresAt,
          createdAt: promo.createdAt,
          ordersCount: used.length,
          customersCount: namedEmails.size + guestOrders,
          registeredCustomers: namedEmails.size,
          guestOrders,
          revenueKzt: used.reduce((sum, o) => sum + o.totalPrice, 0),
          revenueUsd: used.reduce((sum, o) => sum + (o.totalPriceUsd || 0), 0),
          revenueSar: used.reduce((sum, o) => sum + (o.totalPriceSar || 0), 0),
          discountGivenKzt: used.reduce((sum, o) => sum + (o.discountKzt || 0), 0),
        };
      });

      // Busiest partner first - that's the question this table exists to answer.
      return rows.sort((a, b) => b.ordersCount - a.ordersCount || a.code.localeCompare(b.code));
    } catch (err) {
      console.error('List promo codes error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  private parseInput(body: any, { partial }: { partial: boolean }) {
    const data: any = {};

    if (body?.partnerName !== undefined) data.partnerName = String(body.partnerName).trim();

    if (body?.discountPercent !== undefined || !partial) {
      const percent = Number(body?.discountPercent);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        throw new BadRequestException('discountPercent must be a number between 0 and 100');
      }
      data.discountPercent = percent;
    }

    if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive);

    if (body?.maxUses !== undefined) {
      if (body.maxUses === null || body.maxUses === '') {
        data.maxUses = null;
      } else {
        const maxUses = Number(body.maxUses);
        if (!Number.isInteger(maxUses) || maxUses < 1) {
          throw new BadRequestException('maxUses must be a positive whole number or empty');
        }
        data.maxUses = maxUses;
      }
    }

    if (body?.expiresAt !== undefined) {
      if (!body.expiresAt) {
        data.expiresAt = null;
      } else {
        const expires = new Date(body.expiresAt);
        if (Number.isNaN(expires.getTime())) throw new BadRequestException('expiresAt must be a valid date');
        data.expiresAt = expires.toISOString();
      }
    }

    return data;
  }

  async create(body: any) {
    const code = this.normalize(body?.code);
    if (!CODE_PATTERN.test(code)) {
      throw new BadRequestException('Code must be 3-32 characters: latin letters, digits, "-" or "_"');
    }

    const data = this.parseInput(body, { partial: false });

    try {
      const existing = await this.prisma.promoCode.findUnique({ where: { code } });
      if (existing) throw new BadRequestException('A promo code with this name already exists');

      return await this.prisma.promoCode.create({
        data: {
          code,
          partnerName: data.partnerName || '',
          discountPercent: data.discountPercent,
          isActive: data.isActive ?? true,
          maxUses: data.maxUses ?? null,
          expiresAt: data.expiresAt ?? null,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      console.error('Create promo code error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async update(rawCode: string, body: any) {
    const code = this.normalize(rawCode);
    const data = this.parseInput(body, { partial: true });

    try {
      const existing = await this.prisma.promoCode.findUnique({ where: { code } });
      if (!existing) throw new NotFoundException('Promo code not found');

      return await this.prisma.promoCode.update({ where: { code }, data });
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      console.error('Update promo code error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async remove(rawCode: string) {
    const code = this.normalize(rawCode);

    try {
      const existing = await this.prisma.promoCode.findUnique({ where: { code } });
      if (!existing) throw new NotFoundException('Promo code not found');

      // Orders keep the code as plain text, so past orders (and the partner's historical
      // stats) survive this - the code simply stops working for new checkouts.
      await this.prisma.promoCode.delete({ where: { code } });
      return { success: true, code };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      console.error('Delete promo code error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }
}
