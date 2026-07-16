import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface LocalizedText {
  ru?: string;
  en?: string;
  ar?: string;
}

export interface CategoryPayload {
  id?: string;
  name?: LocalizedText;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

@Injectable()
export class CategoriesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Normalizes a localized-text payload into a { ru, en, ar } object, filling any
  // missing language with the English value (mirrors MedicinesService's name handling).
  // Returned as a plain Record so it satisfies Prisma's Json input type directly.
  private normalizeName(name: LocalizedText | undefined): Record<string, string> {
    const en = String(name?.en || name?.ru || '').trim();
    return {
      ru: String(name?.ru || en).trim(),
      en,
      ar: String(name?.ar || en).trim(),
    };
  }

  // Stores the uploaded icon as-is (data URI or URL); empty/blank clears it back to the default.
  private normalizeIcon(icon: string | null | undefined): string | null {
    const trimmed = String(icon || '').trim();
    return trimmed || null;
  }

  async getAll() {
    try {
      return await this.prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
      });
    } catch (err) {
      console.error('Error fetching categories:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async create(body: CategoryPayload) {
    const id = String(body?.id || '').trim().toLowerCase();
    const name = this.normalizeName(body?.name);

    if (!id || !name.en) {
      throw new BadRequestException('Category id and name are required');
    }

    try {
      await this.prisma.category.create({
        data: {
          id,
          name,
          icon: this.normalizeIcon(body?.icon),
          sortOrder: Number(body?.sortOrder || 0),
          isActive: body?.isActive !== false,
        },
      });

      return { success: true, id };
    } catch (err: any) {
      console.error('Error creating category:', err);
      throw new InternalServerErrorException(err.message || 'Database error occurred');
    }
  }

  async update(id: string, body: CategoryPayload) {
    const name = this.normalizeName(body?.name);

    if (!name.en) {
      throw new BadRequestException('Category name is required');
    }

    try {
      await this.prisma.category.update({
        where: { id },
        data: {
          name,
          icon: this.normalizeIcon(body?.icon),
          sortOrder: Number(body?.sortOrder || 0),
          isActive: body?.isActive !== false,
        },
      });

      return { success: true };
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new NotFoundException('Category not found');
      }
      console.error('Error updating category:', err);
      throw new InternalServerErrorException(err.message || 'Database error occurred');
    }
  }

  async delete(id: string) {
    try {
      const linkedMedicines = await this.prisma.medicine.count({ where: { categoryId: id } });
      if (linkedMedicines > 0) {
        throw new BadRequestException('Move medicines to another category before deleting this one');
      }

      await this.prisma.category.delete({ where: { id } });
      return { success: true };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      if (err?.code === 'P2025') {
        throw new NotFoundException('Category not found');
      }
      // A medicine can be created with this categoryId between the count check above and the
      // delete below; the FK (onDelete: Restrict) then rejects the delete with P2003.
      if (err?.code === 'P2003') {
        throw new BadRequestException('Move medicines to another category before deleting this one');
      }
      console.error('Error deleting category:', err);
      throw new InternalServerErrorException(err.message || 'Database error occurred');
    }
  }
}