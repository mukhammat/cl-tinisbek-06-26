/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, Inject, UseGuards } from '@nestjs/common';
import { MedicinesService } from './medicines.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('api')
export class MedicinesController {
  constructor(@Inject(MedicinesService) private readonly medicinesService: MedicinesService) {}

  // `market` filters to what a single storefront should list (e.g. ?market=ar for
  // ar.nadeck.net); omit it (as the admin panel does) to get the full catalog across markets.
  @Get('medicines')
  getAll(@Query('market') market?: string) {
    return this.medicinesService.getAll(market);
  }

  @UseGuards(AdminGuard)
  @Post('medicines')
  create(@Body() body: any) {
    return this.medicinesService.create(body);
  }

  @UseGuards(AdminGuard)
  @Put('medicines/:id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.medicinesService.update(id, body);
  }

  @UseGuards(AdminGuard)
  @Delete('medicines/:id')
  delete(@Param('id') id: string) {
    return this.medicinesService.delete(id);
  }
}
