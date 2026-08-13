/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Inject, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService, MarketScope } from './analytics.service';
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
  summary(@Req() req: any, @Query('days') days?: string, @Query('market') market?: string, @Query('tz') tz?: string) {
    // A market-scoped admin (User.adminMarket) only ever gets their own storefront's traffic;
    // a full admin sees both and may narrow to one with the picker.
    const requested: MarketScope = market === 'main' || market === 'ar' ? market : undefined;
    const scope: MarketScope = req.user?.adminMarket ?? requested;

    return this.analyticsService.summary({ days, market: scope, tzOffsetMinutes: tz });
  }
}
