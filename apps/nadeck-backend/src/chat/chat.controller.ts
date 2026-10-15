/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, HttpCode, HttpStatus, Inject, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';

@Controller('api')
export class ChatController {
  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  processChat(@Body() body: any) {
    return this.chatService.processChat(body);
  }

  // 25 MB is OpenAI's own limit for one transcription request.
  @Post('chat/transcribe')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  transcribe(@UploadedFile() file: Express.Multer.File) {
    return this.chatService.transcribe(file);
  }
}
