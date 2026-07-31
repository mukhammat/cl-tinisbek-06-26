/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BadRequestException, ForbiddenException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type Market = 'main' | 'ar';
const VALID_MARKETS: Market[] = ['main', 'ar'];

export interface LocalizedText {
  ru?: string;
  en?: string;
  ar?: string;
}

export interface DeliveryCountryPayload {
  code?: string;
  name?: LocalizedText;
  priceKzt?: number | string;
  priceUsd?: number | string;
  priceSar?: number | string;
  isActive?: boolean;
  sortOrder?: number | string;
  markets?: string[];
}

const CODE_PATTERN = /^[A-Z]{2}$/;

@Injectable()
export class DeliveryCountriesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Defaults to ['main'], so a country only appears on ar.nadeck.net once opted into it -
  // mirrors CategoriesService.normalizeMarkets.
  private normalizeMarkets(markets: any): Market[] {
    const valid = Array.isArray(markets) ? markets.filter((m) => VALID_MARKETS.includes(m)) : [];
    return valid.length > 0 ? Array.from(new Set(valid)) : ['main'];
  }

  private resolveMarkets(markets: any, adminMarket?: string | null): Market[] {
    if (adminMarket && VALID_MARKETS.includes(adminMarket as Market)) {
      return [adminMarket as Market];
    }
    return this.normalizeMarkets(markets);
  }

  private assertMarketAccess(countryMarkets: Market[], adminMarket?: string | null) {
    if (adminMarket && !countryMarkets.includes(adminMarket as Market)) {
      throw new ForbiddenException('This country is outside your assigned market');
    }
  }

  private normalizeName(name: LocalizedText | undefined): Record<string, string> {
    const en = String(name?.en || name?.ru || '').trim();
    return {
      ru: String(name?.ru || en).trim(),
      en,
      ar: String(name?.ar || en).trim(),
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
  async getAll(market?: string, { activeOnly = false } = {}) {
    try {
      const marketFilter = VALID_MARKETS.includes(market as Market) ? { markets: { has: market as Market } } : {};
      return await this.prisma.deliveryCountry.findMany({
        where: { ...marketFilter, ...(activeOnly ? { isActive: true } : {}) },
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      });
    } catch (err) {
      console.error('Error fetching delivery countries:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  /**
   * The shipping fee for a country, in all three currencies, or null when the code is unknown
   * or switched off. OrdersService uses this instead of the fee the browser reports.
   */
  async resolveFee(rawCode: unknown): Promise<{ code: string; priceKzt: number; priceUsd: number; priceSar: number } | null> {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) return null;

    const country = await this.prisma.deliveryCountry.findUnique({ where: { code } });
    if (!country || !country.isActive) return null;

    return { code: country.code, priceKzt: country.priceKzt, priceUsd: country.priceUsd, priceSar: country.priceSar };
  }

  async create(body: DeliveryCountryPayload, adminMarket?: string | null) {
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
          priceSar: this.normalizePrice(body?.priceSar ?? 0),
          isActive: body?.isActive !== false,
          sortOrder: Number(body?.sortOrder || 0),
          markets: this.resolveMarkets(body?.markets, adminMarket),
        },
      });
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      console.error('Error creating delivery country:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async update(rawCode: string, body: DeliveryCountryPayload, adminMarket?: string | null) {
    const code = String(rawCode || '').trim().toUpperCase();

    try {
      const existing = await this.prisma.deliveryCountry.findUnique({ where: { code } });
      if (!existing) throw new NotFoundException('Country not found');
      this.assertMarketAccess(existing.markets as Market[], adminMarket);

      const data: any = {};
      if (body?.name !== undefined) data.name = this.normalizeName(body.name);
      if (body?.priceKzt !== undefined) data.priceKzt = this.normalizePrice(body.priceKzt);
      if (body?.priceUsd !== undefined) data.priceUsd = this.normalizePrice(body.priceUsd);
      if (body?.priceSar !== undefined) data.priceSar = this.normalizePrice(body.priceSar);
      if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive);
      if (body?.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;
      if (body?.markets !== undefined) data.markets = this.resolveMarkets(body.markets, adminMarket);

      return await this.prisma.deliveryCountry.update({ where: { code }, data });
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      console.error('Error updating delivery country:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async remove(rawCode: string, adminMarket?: string | null) {
    const code = String(rawCode || '').trim().toUpperCase();

    try {
      const existing = await this.prisma.deliveryCountry.findUnique({ where: { code } });
      if (!existing) throw new NotFoundException('Country not found');
      this.assertMarketAccess(existing.markets as Market[], adminMarket);

      // Past orders keep the country inside their address JSON, so removing a destination
      // only stops new checkouts - it doesn't rewrite history.
      await this.prisma.deliveryCountry.delete({ where: { code } });
      return { success: true, code };
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      console.error('Error deleting delivery country:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }
}
