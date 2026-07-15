/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Inject, Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class NewsletterService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async subscribe(body: any) {
    const email = String(body?.email || '').trim().toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('A valid email is required');
    }

    try {
      await this.prisma.newsletterSubscriber.upsert({
        where: { email },
        update: {},
        create: { email, createdAt: new Date().toISOString() },
      });
      return { success: true };
    } catch (err) {
      console.error('Newsletter subscribe error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }
}
