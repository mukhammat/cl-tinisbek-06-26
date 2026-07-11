/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('api')
export class ChatController {
  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  processChat(@Body() body: any) {
    return this.chatService.processChat(body);
  }
}
