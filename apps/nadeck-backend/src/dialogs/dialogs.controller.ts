/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Body, Controller, ForbiddenException, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { DialogsService } from './dialogs.service';

// The bot sells for nadeck.net only (KZT catalog), so its chats belong to full admins - a
// market-scoped ar.nadeck.net admin gets neither the tab nor these routes.
function assertFullAdmin(req: any) {
  if (req.user?.adminMarket) throw new ForbiddenException('Bot dialogs are available to nadeck.net admins only');
}

@UseGuards(AdminGuard)
@Controller('api/admin/dialogs')
export class DialogsController {
  constructor(@Inject(DialogsService) private readonly dialogsService: DialogsService) {}

  @Get()
  list(@Req() req: any) {
    assertFullAdmin(req);
    return this.dialogsService.list();
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    assertFullAdmin(req);
    return this.dialogsService.get(id);
  }

  // Sends the text to the customer as the bot and keeps the advisor quiet for a while.
  @Post(':id/reply')
  reply(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    assertFullAdmin(req);
    return this.dialogsService.reply(id, body?.text);
  }

  // { paused: true } = take the chat over without writing yet; false = hand it back to the bot.
  @Patch(':id')
  setPause(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    assertFullAdmin(req);
    return this.dialogsService.setPause(id, body?.paused === true);
  }
}
