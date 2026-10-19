/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Delete, Body, Param, Inject, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnEmailGuard } from '../auth/own-email.guard';

@Controller('api/notifications')
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  subscribe(@Body() body: { medicineId: string }, @Req() req: any) {
    return this.notificationsService.subscribe(req.user.email, body.medicineId);
  }

  @UseGuards(OwnEmailGuard)
  @Delete('subscribe/:email/:medicineId')
  unsubscribe(@Param('email') email: string, @Param('medicineId') medicineId: string) {
    return this.notificationsService.unsubscribe(email, medicineId);
  }

  @UseGuards(OwnEmailGuard)
  @Get('subscriptions/:email')
  getSubscriptions(@Param('email') email: string) {
    return this.notificationsService.getSubscriptions(email);
  }

  @UseGuards(OwnEmailGuard)
  @Get(':email')
  getForUser(@Param('email') email: string) {
    return this.notificationsService.getForUser(email);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/read')
  markRead(@Param('id') id: string, @Req() req: any) {
    return this.notificationsService.markRead(id, req.user.email);
  }

  @UseGuards(OwnEmailGuard)
  @Post('read-all/:email')
  markAllRead(@Param('email') email: string) {
    return this.notificationsService.markAllRead(email);
  }
}
