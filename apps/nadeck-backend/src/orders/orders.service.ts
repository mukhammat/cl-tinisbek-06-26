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
      subtotalPrice,
      subtotalPriceUsd,
      deliveryPrice,
      deliveryPriceUsd,
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
      };
      // Shipping is charged at the rate stored for the destination country, not the one the
      // browser reports. Falls back to the reported figure only while no country has been
      // configured yet - the country picker is hidden in that state too.
      const countryFee = await this.deliveryCountries.resolveFee(address?.country);
      const delivery = countryFee
        ? { kzt: countryFee.priceKzt, usd: countryFee.priceUsd }
        : { kzt: num(deliveryPrice), usd: num(deliveryPriceUsd) };

      // Never trust a discount computed in the browser: the percentage is re-read from the
      // database here, and an expired or exhausted code silently charges full price.
      const resolved = promoCode ? await this.promoCodes.resolve(promoCode) : null;
      const promo = resolved && 'promo' in resolved ? resolved.promo : null;
      const percent = promo?.discountPercent ?? 0;

      const discount = {
        kzt: round2((goods.kzt * percent) / 100),
        usd: round2((goods.usd * percent) / 100),
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
          address,
          paymentMethod,
          status: 'pending',
          promoCode: promo?.code ?? null,
          discountPercent: percent,
          discountKzt: discount.kzt,
          discountUsd: discount.usd,
        }
      });

      return {
        id: order.id,
        date: order.date,
        userEmail: order.userEmail,
        items,
        totalPrice: order.totalPrice,
        totalPriceUsd: order.totalPriceUsd,
        address,
        paymentMethod: order.paymentMethod,
        status: order.status,
        promoCode: order.promoCode,
        discountPercent: order.discountPercent,
        discountKzt: order.discountKzt,
        discountUsd: order.discountUsd,
      };
    } catch (err) {
      console.error('Place order error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  // Checkout from the Telegram bot. Unlike the storefront, the bot sends only what was picked
  // (product id + pack size + quantity) and every price is looked up here, so the total the
  // manager sees can't drift from the catalog. Payment is taken by the manager afterwards, so
  // the order is only recorded as pending - the bot then hands the customer over to them.
  async placeTelegramOrder(body: any) {
    const { items, address, telegram } = body ?? {};
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }
    const text = (value: any, max = 200) => String(value ?? '').trim().slice(0, max);
    const phone = text(address?.phone, 40);
    const city = text(address?.city);
    if (!phone || !city) {
      throw new BadRequestException('Phone and city are required');
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: items.map((i: any) => String(i?.productId)) } },
      include: { medicine: true, additionalGood: true },
    });

    const orderItems = items.map((i: any) => {
      const product = products.find((p) => p.id === String(i?.productId));
      if (!product || product.inStock !== 1) {
        throw new BadRequestException(`Product ${i?.productId} is not available`);
      }
      const volumes: any[] = ((product.medicine?.volumes ?? product.additionalGood?.volumes) as any[]) || [];
      const volume = volumes.find((v) => Number(v?.mgPerUnit) === Number(i?.mgPerUnit));
      const quantity = Math.floor(Number(i?.quantity));
      if (!volume || !(Number(volume.price) > 0) || !(quantity >= 1 && quantity <= 100)) {
        throw new BadRequestException(`Invalid pack size or quantity for ${product.id}`);
      }
      return {
        medicineName: product.name,
        productId: product.id,
        mgPerUnit: Number(volume.mgPerUnit),
        unit: product.unit,
        price: Number(volume.price),
        priceUsd: Number(volume.priceUsd) || 0,
        quantity,
      };
    });

    const goods = {
      kzt: orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
      usd: orderItems.reduce((sum, i) => sum + i.priceUsd * i.quantity, 0),
    };
    const countryFee = await this.deliveryCountries.resolveFee(address?.country);
    const delivery = countryFee
      ? { kzt: countryFee.priceKzt, usd: countryFee.priceUsd }
      : { kzt: 0, usd: 0 };

    const username = text(telegram?.username, 64);
    const telegramId = text(telegram?.id, 32);
    const trackingNumber = 'PP-' + Math.floor(100000 + Math.random() * 900000);

    try {
      const order = await this.prisma.order.create({
        data: {
          id: trackingNumber,
          date: new Date().toLocaleDateString('ru-RU'),
          // No account behind a Telegram customer - the handle is what the manager searches by.
          userEmail: username ? `tg:@${username}` : `tg:${telegramId || 'guest'}`,
          items: orderItems,
          totalPrice: round2(goods.kzt + delivery.kzt),
          totalPriceUsd: round2(goods.usd + delivery.usd),
          address: {
            country: countryFee?.code ?? '',
            city,
            street: text(address?.street),
            apartment: '',
            postalCode: '',
            name: text(address?.name, 100),
            phone,
            telegram: username ? `@${username}` : telegramId,
          },
          paymentMethod: 'Telegram-бот (оплата через менеджера)',
          status: 'pending',
        },
      });

      return {
        id: order.id,
        items: orderItems,
        subtotal: round2(goods.kzt),
        delivery: round2(delivery.kzt),
        totalPrice: order.totalPrice,
        address: order.address,
      };
    } catch (err) {
      console.error('Place Telegram order error:', err);
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
        address: o.address,
        paymentMethod: o.paymentMethod,
        status: o.status,
        promoCode: o.promoCode,
        discountPercent: o.discountPercent,
        discountKzt: o.discountKzt,
        discountUsd: o.discountUsd,
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
        address: o.address,
        paymentMethod: o.paymentMethod,
        status: o.status,
        promoCode: o.promoCode,
        discountPercent: o.discountPercent,
        discountKzt: o.discountKzt,
        discountUsd: o.discountUsd,
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
