import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type MediaKind = 'video' | 'photo';
const KINDS: MediaKind[] = ['video', 'photo'];

export interface MediaItemPayload {
  kind?: MediaKind;
  title?: { ru?: string; en?: string };
  src?: string;
  poster?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

@Injectable()
export class MediaFeedService {
  private readonly publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Missing language falls back to the other one, so a video titled only in Russian still
  // shows a caption on the English site.
  private normalizeTitle(title: MediaItemPayload['title']): Record<string, string> {
    const ru = String(title?.ru ?? '').trim();
    const en = String(title?.en ?? '').trim();
    return { ru: ru || en, en: en || ru };
  }

  private normalizeKind(kind: unknown): MediaKind {
    if (!KINDS.includes(kind as MediaKind)) throw new BadRequestException('kind must be video or photo');
    return kind as MediaKind;
  }

  // Only files from our own bucket: the feed shows whatever is stored here.
  private normalizeMediaUrl(value: unknown, field: string, required: boolean): string | null {
    const url = String(value ?? '').trim();
    if (!url) {
      if (required) throw new BadRequestException(`${field} is required`);
      return null;
    }
    if (!this.publicUrl || !url.startsWith(`${this.publicUrl}/`)) throw new BadRequestException(`${field} must be an uploaded file`);
    return url;
  }

  // Storefront: active items in feed order. Admin: all of them. Optionally one kind only.
  async getAll({ activeOnly = false, kind }: { activeOnly?: boolean; kind?: unknown } = {}) {
    return this.prisma.mediaItem.findMany({
      where: {
        ...(activeOnly && { isActive: true }),
        ...(kind !== undefined && kind !== '' && { kind: this.normalizeKind(kind) }),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(body: MediaItemPayload) {
    const kind = this.normalizeKind(body?.kind ?? 'video');
    const last = await this.prisma.mediaItem.findFirst({ where: { kind }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    return this.prisma.mediaItem.create({
      data: {
        kind,
        title: this.normalizeTitle(body?.title),
        src: this.normalizeMediaUrl(body?.src, 'src', true)!,
        poster: kind === 'video' ? this.normalizeMediaUrl(body?.poster, 'poster', false) : null,
        sortOrder: Number.isFinite(body?.sortOrder) ? Number(body.sortOrder) : (last?.sortOrder ?? -1) + 1,
        isActive: body?.isActive !== false,
      },
    });
  }

  async update(id: string, body: MediaItemPayload) {
    const existing = await this.prisma.mediaItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Media item not found');
    return this.prisma.mediaItem.update({
      where: { id },
      data: {
        ...(body?.title !== undefined && { title: this.normalizeTitle(body.title) }),
        ...(body?.src !== undefined && { src: this.normalizeMediaUrl(body.src, 'src', true)! }),
        ...(body?.poster !== undefined && { poster: this.normalizeMediaUrl(body.poster, 'poster', false) }),
        ...(body?.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder)) && { sortOrder: Number(body.sortOrder) }),
        ...(body?.isActive !== undefined && { isActive: Boolean(body.isActive) }),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.mediaItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Media item not found');
    await this.prisma.mediaItem.delete({ where: { id } });
    return { success: true };
  }
}
