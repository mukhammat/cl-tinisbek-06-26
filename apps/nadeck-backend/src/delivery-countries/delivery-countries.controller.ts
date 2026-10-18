/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Body, Controller, Delete, Get, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { DeliveryCountriesService, DeliveryCountryPayload } from './delivery-countries.service';

@Controller('api')
export class DeliveryCountriesController {
  constructor(@Inject(DeliveryCountriesService) private readonly deliveryCountriesService: DeliveryCountriesService) {}

  // Public: what the checkout country picker offers, so switched-off countries stay hidden.
  @Get('delivery-countries')
  getAll() {
    return this.deliveryCountriesService.getAll({ activeOnly: true });
  }

  // Admin panel read - every country, including the switched-off ones.
  @UseGuards(AdminGuard)
  @Get('admin/delivery-countries')
  getAllForAdmin() {
    return this.deliveryCountriesService.getAll();
  }

  @UseGuards(AdminGuard)
  @Post('admin/delivery-countries')
  create(@Body() body: DeliveryCountryPayload) {
    return this.deliveryCountriesService.create(body);
  }

  @UseGuards(AdminGuard)
  @Put('admin/delivery-countries/:code')
  update(@Param('code') code: string, @Body() body: DeliveryCountryPayload) {
    return this.deliveryCountriesService.update(code, body);
  }

  @UseGuards(AdminGuard)
  @Delete('admin/delivery-countries/:code')
  remove(@Param('code') code: string) {
    return this.deliveryCountriesService.remove(code);
  }
}
