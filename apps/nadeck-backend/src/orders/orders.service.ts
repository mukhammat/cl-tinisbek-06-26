/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Inject, Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OrdersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async placeOrder(body: any) {
    const { email, items, totalPrice, totalPriceUsd, address, paymentMethod } = body;
    if (!items || !totalPrice || !address) {
      throw new BadRequestException('Invalid cart or address details');
    }

    try {
      const trackingNumber = 'PP-' + Math.floor(100000 + Math.random() * 900000);
      const dateStr = new Date().toLocaleDateString('ru-RU');
      const userEmailVal = email ? email.toLowerCase() : 'guest';

      const order = await this.prisma.order.create({
        data: {
          id: trackingNumber,
          date: dateStr,
          userEmail: userEmailVal,
          items,
          totalPrice: parseFloat(totalPrice),
          totalPriceUsd: parseFloat(totalPriceUsd || 0),
          address,
          paymentMethod,
          status: 'pending',
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
        address: o.address,
        paymentMethod: o.paymentMethod,
        status: o.status,
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
