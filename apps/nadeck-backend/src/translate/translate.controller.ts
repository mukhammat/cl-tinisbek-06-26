/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { TranslateService } from './translate.service';

@Controller('api/admin/translate')
@UseGuards(AdminGuard)
export class TranslateController {
  constructor(@Inject(TranslateService) private readonly translateService: TranslateService) {}

  @Post('category')
  translateCategory(@Body() body: any) {
    return this.translateService.translateCategory(body);
  }

  @Post('medicine')
  translateMedicine(@Body() body: any) {
    return this.translateService.translateMedicine(body);
  }
}
