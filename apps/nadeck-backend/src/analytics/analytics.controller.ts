/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('api')
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analyticsService: AnalyticsService) {}

  // Public: the storefront posts one of these per screen the visitor opens. Always 200 and
  // never throws - a page view that fails to record is not the visitor's problem.
  @Post('analytics/track')
  @HttpCode(HttpStatus.NO_CONTENT)
  async track(@Body() body: any, @Headers() headers: Record<string, any>) {
    await this.analyticsService.track(body, headers);
  }

  @UseGuards(AdminGuard)
  @Get('admin/analytics')
  summary(@Query('days') days?: string, @Query('tz') tz?: string) {
    return this.analyticsService.summary({ days, tzOffsetMinutes: tz });
  }
}
