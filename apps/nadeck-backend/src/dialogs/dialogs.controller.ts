/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { DialogsService } from './dialogs.service';

@UseGuards(AdminGuard)
@Controller('api/admin/dialogs')
export class DialogsController {
  constructor(@Inject(DialogsService) private readonly dialogsService: DialogsService) {}

  @Get()
  list() {
    return this.dialogsService.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.dialogsService.get(id);
  }

  // Sends the text to the customer as the bot and keeps the advisor quiet for a while.
  @Post(':id/reply')
  reply(@Param('id') id: string, @Body() body: any) {
    return this.dialogsService.reply(id, body?.text);
  }

  // { paused: true } = take the chat over without writing yet; false = hand it back to the bot.
  @Patch(':id')
  setPause(@Param('id') id: string, @Body() body: any) {
    return this.dialogsService.setPause(id, body?.paused === true);
  }
}
