/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Post, Delete, Body, Param, Inject } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('api/notifications')
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly notificationsService: NotificationsService) {}

  @Post('subscribe')
  subscribe(@Body() body: { email: string; medicineId: string }) {
    return this.notificationsService.subscribe(body.email, body.medicineId);
  }

  @Delete('subscribe/:email/:medicineId')
  unsubscribe(@Param('email') email: string, @Param('medicineId') medicineId: string) {
    return this.notificationsService.unsubscribe(email, medicineId);
  }

  @Get('subscriptions/:email')
  getSubscriptions(@Param('email') email: string) {
    return this.notificationsService.getSubscriptions(email);
  }

  @Get(':email')
  getForUser(@Param('email') email: string) {
    return this.notificationsService.getForUser(email);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string) {
    return this.notificationsService.markRead(id);
  }

  @Post('read-all/:email')
  markAllRead(@Param('email') email: string) {
    return this.notificationsService.markAllRead(email);
  }
}
