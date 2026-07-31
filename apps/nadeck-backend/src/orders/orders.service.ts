/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Inject, Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { DeliveryCountriesService } from '../delivery-countries/delivery-countries.service';

const round2 = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PromoCodesService) private readonly promoCodes: PromoCodesService,
    @Inject(DeliveryCountriesService) private readonly deliveryCountries: DeliveryCountriesService,
  ) {}

  async placeOrder(body: any) {
    const {
      email,
      items,
      totalPrice,
      totalPriceUsd,
      totalPriceSar,
      subtotalPrice,
      subtotalPriceUsd,
      subtotalPriceSar,
      deliveryPrice,
      deliveryPriceUsd,
      deliveryPriceSar,
      promoCode,
      address,
      paymentMethod,
    } = body;
    if (!items || !totalPrice || !address) {
      throw new BadRequestException('Invalid cart or address details');
    }

    try {
      const num = (value: any) => {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
      };

      // The discount comes off goods only, so the split matters. Callers that don't send one
      // (older clients) get the whole total treated as goods - the discount is then simply
      // applied to everything, which is still correct arithmetic, just more generous.
      const goods = {
        kzt: subtotalPrice !== undefined ? num(subtotalPrice) : num(totalPrice),
        usd: subtotalPriceUsd !== undefined ? num(subtotalPriceUsd) : num(totalPriceUsd),
        sar: subtotalPriceSar !== undefined ? num(subtotalPriceSar) : num(totalPriceSar),
      };
      // Shipping is charged at the rate stored for the destination country, not the one the
      // browser reports. Falls back to the reported figure only while no country has been
      // configured yet - the country picker is hidden in that state too.
      const countryFee = await this.deliveryCountries.resolveFee(address?.country);
      const delivery = countryFee
        ? { kzt: countryFee.priceKzt, usd: countryFee.priceUsd, sar: countryFee.priceSar }
        : { kzt: num(deliveryPrice), usd: num(deliveryPriceUsd), sar: num(deliveryPriceSar) };

      // Never trust a discount computed in the browser: the percentage is re-read from the
      // database here, and an expired or exhausted code silently charges full price.
      const resolved = promoCode ? await this.promoCodes.resolve(promoCode) : null;
      const promo = resolved && 'promo' in resolved ? resolved.promo : null;
      const percent = promo?.discountPercent ?? 0;

      const discount = {
        kzt: round2((goods.kzt * percent) / 100),
        usd: round2((goods.usd * percent) / 100),
        sar: round2((goods.sar * percent) / 100),
      };

      const trackingNumber = 'PP-' + Math.floor(100000 + Math.random() * 900000);
      const dateStr = new Date().toLocaleDateString('ru-RU');
      const userEmailVal = email ? email.toLowerCase() : 'guest';

      const order = await this.prisma.order.create({
        data: {
          id: trackingNumber,
          date: dateStr,
          userEmail: userEmailVal,
          items,
          totalPrice: round2(goods.kzt - discount.kzt + delivery.kzt),
          totalPriceUsd: round2(goods.usd - discount.usd + delivery.usd),
          totalPriceSar: round2(goods.sar - discount.sar + delivery.sar),
          address,
          paymentMethod,
          status: 'pending',
          promoCode: promo?.code ?? null,
          discountPercent: percent,
          discountKzt: discount.kzt,
          discountUsd: discount.usd,
          discountSar: discount.sar,
        }
      });

      return {
        id: order.id,
        date: order.date,
        userEmail: order.userEmail,
        items,
        totalPrice: order.totalPrice,
        totalPriceUsd: order.totalPriceUsd,
        totalPriceSar: order.totalPriceSar,
        address,
        paymentMethod: order.paymentMethod,
        status: order.status,
        promoCode: order.promoCode,
        discountPercent: order.discountPercent,
        discountKzt: order.discountKzt,
        discountUsd: order.discountUsd,
        discountSar: order.discountSar,
      };
    } catch (err) {
      console.error('Place order error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async getUserOrders(email: string) {
    if (!email) {
      throw new BadRequestException('User email is required');
    }

    try {
      const rows = await this.prisma.order.findMany({
        where: { userEmail: email.toLowerCase() },
      });
      
      // Sort in memory (newest first, mimicking DESC order)
      const reversed = [...rows].reverse();

      return reversed.map((o) => ({
        id: o.id,
        date: o.date,
        items: o.items,
        totalPrice: o.totalPrice,
        totalPriceUsd: o.totalPriceUsd,
        totalPriceSar: o.totalPriceSar,
        address: o.address,
        paymentMethod: o.paymentMethod,
        status: o.status,
        promoCode: o.promoCode,
        discountPercent: o.discountPercent,
        discountKzt: o.discountKzt,
        discountUsd: o.discountUsd,
        discountSar: o.discountSar,
      }));
    } catch (err) {
      console.error('Get orders error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async getAdminOrders() {
    try {
      const rows = await this.prisma.order.findMany();
      
      // Newest first, mimicking DESC order
      const reversed = [...rows].reverse();

      return reversed.map((o) => ({
        id: o.id,
        date: o.date,
        userEmail: o.userEmail,
        items: o.items,
        totalPrice: o.totalPrice,
        totalPriceUsd: o.totalPriceUsd,
        totalPriceSar: o.totalPriceSar,
        address: o.address,
        paymentMethod: o.paymentMethod,
        status: o.status,
        promoCode: o.promoCode,
        discountPercent: o.discountPercent,
        discountKzt: o.discountKzt,
        discountUsd: o.discountUsd,
        discountSar: o.discountSar,
      }));
    } catch (err) {
      console.error('Get all orders error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async updateOrderStatus(id: string, status: string) {
    if (!['pending', 'processing', 'shipped', 'delivered'].includes(status)) {
      throw new BadRequestException('Invalid order status value');
    }

    try {
      await this.prisma.order.update({
        where: { id },
        data: { status },
      });
      return { success: true, id, status };
    } catch (err) {
      console.error('Update order status error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }
}
