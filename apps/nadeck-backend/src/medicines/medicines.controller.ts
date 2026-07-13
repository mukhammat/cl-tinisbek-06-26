/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Inject, UseGuards } from '@nestjs/common';
import { MedicinesService } from './medicines.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('api')
export class MedicinesController {
  constructor(@Inject(MedicinesService) private readonly medicinesService: MedicinesService) {}

  @Get('medicines')
  getAll() {
    return this.medicinesService.getAll();
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
