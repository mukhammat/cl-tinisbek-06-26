/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PromoCodesService } from './promo-codes.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('api')
export class PromoCodesController {
  constructor(@Inject(PromoCodesService) private readonly promoCodesService: PromoCodesService) {}

  // Public: the cart checks a code before checkout. The real discount is applied server-side
  // when the order is placed (see OrdersService), so this endpoint is display-only.
  @Post('promo-codes/validate')
  @HttpCode(HttpStatus.OK)
  validate(@Body('code') code: string) {
    return this.promoCodesService.validate(code);
  }

  @UseGuards(AdminGuard)
  @Get('admin/promo-codes')
  list() {
    return this.promoCodesService.listWithStats();
  }

  @UseGuards(AdminGuard)
  @Post('admin/promo-codes')
  create(@Body() body: any) {
    return this.promoCodesService.create(body);
  }

  @UseGuards(AdminGuard)
  @Put('admin/promo-codes/:code')
  update(@Param('code') code: string, @Body() body: any) {
    return this.promoCodesService.update(code, body);
  }

  @UseGuards(AdminGuard)
  @Delete('admin/promo-codes/:code')
  remove(@Param('code') code: string) {
    return this.promoCodesService.remove(code);
  }
}
