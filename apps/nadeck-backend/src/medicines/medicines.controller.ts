/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Inject } from '@nestjs/common';
import { MedicinesService } from './medicines.service';

@Controller('api')
export class MedicinesController {
  constructor(@Inject(MedicinesService) private readonly medicinesService: MedicinesService) {}

  @Get('medicines')
  getAll() {
    return this.medicinesService.getAll();
  }

  @Post('medicines')
  create(@Body() body: any) {
    return this.medicinesService.create(body);
  }

  @Put('medicines/:id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.medicinesService.update(id, body);
  }

  @Delete('medicines/:id')
  delete(@Param('id') id: string) {
    return this.medicinesService.delete(id);
  }
}
