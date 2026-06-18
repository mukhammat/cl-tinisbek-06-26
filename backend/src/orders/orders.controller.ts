/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Put, Body, Param, Inject } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('api')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly ordersService: OrdersService) {}

  @Post('orders')
  placeOrder(@Body() body: any) {
    return this.ordersService.placeOrder(body);
  }

  @Get('orders/:email')
  getUserOrders(@Param('email') email: string) {
    return this.ordersService.getUserOrders(email);
  }

  @Get('admin/orders')
  getAdminOrders() {
    return this.ordersService.getAdminOrders();
  }

  @Put('admin/orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateOrderStatus(id, status);
  }
}
