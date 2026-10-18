/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface LocalizedText {
  ru?: string;
  en?: string;
}

export interface DeliveryCountryPayload {
  code?: string;
  name?: LocalizedText;
  priceKzt?: number | string;
  priceUsd?: number | string;
  isActive?: boolean;
  sortOrder?: number | string;
}

const CODE_PATTERN = /^[A-Z]{2}$/;

@Injectable()
export class DeliveryCountriesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private normalizeName(name: LocalizedText | undefined): Record<string, string> {
    const en = String(name?.en || name?.ru || '').trim();
    return {
      ru: String(name?.ru || en).trim(),
      en,
    };
  }

  private normalizePrice(value: unknown): number {
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) {
      throw new BadRequestException('Delivery price must be a number of 0 or more');
    }
    return price;
  }

  // Checkout only offers countries that are switched on; the admin table shows every one.
  async getAll({ activeOnly = false } = {}) {
    try {
      return await this.prisma.deliveryCountry.findMany({
        where: activeOnly ? { isActive: true } : undefined,
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      });
    } catch (err) {
      console.error('Error fetching delivery countries:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  /**
   * The shipping fee for a country, in both currencies, or null when the code is unknown
   * or switched off. OrdersService uses this instead of the fee the browser reports.
   */
  async resolveFee(rawCode: unknown): Promise<{ code: string; priceKzt: number; priceUsd: number } | null> {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) return null;

    const country = await this.prisma.deliveryCountry.findUnique({ where: { code } });
    if (!country || !country.isActive) return null;

    return { code: country.code, priceKzt: country.priceKzt, priceUsd: country.priceUsd };
  }

  async create(body: DeliveryCountryPayload) {
    const code = String(body?.code || '').trim().toUpperCase();
    const name = this.normalizeName(body?.name);

    if (!CODE_PATTERN.test(code)) {
      throw new BadRequestException('Country code must be two latin letters, e.g. KZ');
    }
    if (!name.en) {
      throw new BadRequestException('Country name is required');
    }

    try {
      const existing = await this.prisma.deliveryCountry.findUnique({ where: { code } });
      if (existing) throw new BadRequestException('This country is already on the list');

      return await this.prisma.deliveryCountry.create({
        data: {
          code,
          name,
          priceKzt: this.normalizePrice(body?.priceKzt ?? 0),
          priceUsd: this.normalizePrice(body?.priceUsd ?? 0),
          isActive: body?.isActive !== false,
          sortOrder: Number(body?.sortOrder || 0),
        },
      });
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      console.error('Error creating delivery country:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async update(rawCode: string, body: DeliveryCountryPayload) {
    const code = String(rawCode || '').trim().toUpperCase();

    try {
      const existing = await this.prisma.deliveryCountry.findUnique({ where: { code } });
      if (!existing) throw new NotFoundException('Country not found');

      const data: any = {};
      if (body?.name !== undefined) data.name = this.normalizeName(body.name);
      if (body?.priceKzt !== undefined) data.priceKzt = this.normalizePrice(body.priceKzt);
      if (body?.priceUsd !== undefined) data.priceUsd = this.normalizePrice(body.priceUsd);
      if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive);
      if (body?.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;

      return await this.prisma.deliveryCountry.update({ where: { code }, data });
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      console.error('Error updating delivery country:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async remove(rawCode: string) {
    const code = String(rawCode || '').trim().toUpperCase();

    try {
      const existing = await this.prisma.deliveryCountry.findUnique({ where: { code } });
      if (!existing) throw new NotFoundException('Country not found');

      // Past orders keep the country inside their address JSON, so removing a destination
      // only stops new checkouts - it doesn't rewrite history.
      await this.prisma.deliveryCountry.delete({ where: { code } });
      return { success: true, code };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      console.error('Error deleting delivery country:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }
}
