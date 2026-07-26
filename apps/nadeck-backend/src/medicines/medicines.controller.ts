/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Inject, UseGuards } from '@nestjs/common';
import { MedicinesService } from './medicines.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('api')
export class MedicinesController {
  constructor(@Inject(MedicinesService) private readonly medicinesService: MedicinesService) {}

  // Public storefront read - `market` filters to what a single site should list (e.g.
  // ?market=ar for ar.nadeck.net).
  @Get('medicines')
  getAll(@Query('market') market?: string) {
    return this.medicinesService.getAll(market);
  }

  // Admin panel read - full catalog for a full admin, or just their own market for a
  // market-scoped admin (User.adminMarket), so a scoped admin never sees products outside
  // their storefront in the first place.
  @UseGuards(AdminGuard)
  @Get('medicines/admin')
  getAllForAdmin(@Req() req: any) {
    return this.medicinesService.getAll(req.user.adminMarket ?? undefined);
  }

  @UseGuards(AdminGuard)
  @Post('medicines')
  create(@Body() body: any, @Req() req: any) {
    return this.medicinesService.create(body, req.user.adminMarket);
  }

  @UseGuards(AdminGuard)
  @Put('medicines/:id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.medicinesService.update(id, body, req.user.adminMarket);
  }

  @UseGuards(AdminGuard)
  @Delete('medicines/:id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.medicinesService.delete(id, req.user.adminMarket);
  }
}
