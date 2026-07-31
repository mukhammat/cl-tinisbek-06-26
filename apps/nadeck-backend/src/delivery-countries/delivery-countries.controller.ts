/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { DeliveryCountriesService, DeliveryCountryPayload } from './delivery-countries.service';

@Controller('api')
export class DeliveryCountriesController {
  constructor(@Inject(DeliveryCountriesService) private readonly deliveryCountriesService: DeliveryCountriesService) {}

  // Public: what the checkout country picker offers, so switched-off countries stay hidden.
  @Get('delivery-countries')
  getAll(@Query('market') market?: string) {
    return this.deliveryCountriesService.getAll(market, { activeOnly: true });
  }

  // Admin panel read - every country, including the switched-off ones.
  @UseGuards(AdminGuard)
  @Get('admin/delivery-countries')
  getAllForAdmin(@Req() req: any) {
    return this.deliveryCountriesService.getAll(req.user.adminMarket ?? undefined);
  }

  @UseGuards(AdminGuard)
  @Post('admin/delivery-countries')
  create(@Body() body: DeliveryCountryPayload, @Req() req: any) {
    return this.deliveryCountriesService.create(body, req.user.adminMarket);
  }

  @UseGuards(AdminGuard)
  @Put('admin/delivery-countries/:code')
  update(@Param('code') code: string, @Body() body: DeliveryCountryPayload, @Req() req: any) {
    return this.deliveryCountriesService.update(code, body, req.user.adminMarket);
  }

  @UseGuards(AdminGuard)
  @Delete('admin/delivery-countries/:code')
  remove(@Param('code') code: string, @Req() req: any) {
    return this.deliveryCountriesService.remove(code, req.user.adminMarket);
  }
}
