import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface ReviewPayload {
  author?: string;
  text?: string;
  rating?: number;
  date?: string;
  isVerified?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

@Injectable()
export class ReviewsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private requiredText(value: unknown, field: string, max: number): string {
    const text = String(value ?? '').trim();
    if (!text) throw new BadRequestException(`${field} is required`);
    return text.slice(0, max);
  }

  private rating(value: unknown): number {
    const rating = Math.round(Number(value));
    if (!(rating >= 1 && rating <= 5)) throw new BadRequestException('rating must be 1-5');
    return rating;
  }

  private date(value: unknown): string {
    const date = String(value ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    return date;
  }

  // Storefront: active reviews in carousel order. Admin: all of them.
  async getAll({ activeOnly = false } = {}) {
    return this.prisma.review.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(body: ReviewPayload) {
    const last = await this.prisma.review.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    return this.prisma.review.create({
      data: {
        author: this.requiredText(body?.author, 'author', 80),
        text: this.requiredText(body?.text, 'text', 3000),
        rating: this.rating(body?.rating ?? 5),
        date: this.date(body?.date),
        isVerified: body?.isVerified !== false,
        sortOrder: Number.isFinite(body?.sortOrder) ? Number(body.sortOrder) : (last?.sortOrder ?? -1) + 1,
        isActive: body?.isActive !== false,
      },
    });
  }

  async update(id: string, body: ReviewPayload) {
    const existing = await this.prisma.review.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Review not found');
    return this.prisma.review.update({
      where: { id },
      data: {
        ...(body?.author !== undefined && { author: this.requiredText(body.author, 'author', 80) }),
        ...(body?.text !== undefined && { text: this.requiredText(body.text, 'text', 3000) }),
        ...(body?.rating !== undefined && { rating: this.rating(body.rating) }),
        ...(body?.date !== undefined && { date: this.date(body.date) }),
        ...(body?.isVerified !== undefined && { isVerified: Boolean(body.isVerified) }),
        ...(body?.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder)) && { sortOrder: Number(body.sortOrder) }),
        ...(body?.isActive !== undefined && { isActive: Boolean(body.isActive) }),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.review.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Review not found');
    await this.prisma.review.delete({ where: { id } });
    return { success: true };
  }
}
