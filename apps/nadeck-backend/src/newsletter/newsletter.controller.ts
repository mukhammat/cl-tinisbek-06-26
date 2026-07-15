/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';

@Controller('api/newsletter')
export class NewsletterController {
  constructor(@Inject(NewsletterService) private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  subscribe(@Body() body: any) {
    return this.newsletterService.subscribe(body);
  }
}
