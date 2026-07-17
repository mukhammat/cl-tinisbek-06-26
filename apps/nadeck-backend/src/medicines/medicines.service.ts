/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Inject, Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// The one place the fallback category id is defined - every caller resolves through
// resolveCategoryId() below instead of repeating the literal.
const DEFAULT_CATEGORY_ID = 'weightloss';

@Injectable()
export class MedicinesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  // Normalizes the admin-submitted volumes list into { mgPerUnit, price, priceUsd } triples, dropping anything invalid
  private normalizeVolumes(volumes: any): { mgPerUnit: number; price: number; priceUsd: number }[] {
    if (!Array.isArray(volumes)) return [];
    return volumes
      .map((v) => ({ mgPerUnit: Number(v?.mgPerUnit), price: Number(v?.price), priceUsd: Number(v?.priceUsd || 0) }))
      .filter((v) => Number.isFinite(v.mgPerUnit) && v.mgPerUnit > 0 && Number.isFinite(v.price) && v.price >= 0 && Number.isFinite(v.priceUsd) && v.priceUsd >= 0);
  }

  // Resolves the category id from either the current `categoryId` field or the legacy
  // `category` field, falling back to DEFAULT_CATEGORY_ID, and verifies it actually exists.
  private async resolveCategoryId(categoryId: any, category: any): Promise<string> {
    const resolvedCategoryId = String(categoryId || category || DEFAULT_CATEGORY_ID).trim();
    const categoryExists = await this.prisma.category.findUnique({ where: { id: resolvedCategoryId } });
    if (!categoryExists) {
      throw new BadRequestException('Selected category does not exist');
    }
    return resolvedCategoryId;
  }

  async getAll() {
    try {
      const rows = await this.prisma.medicine.findMany();
      return rows.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.categoryId,
        description: m.description,
        fullDescription: m.fullDescription,
        indications: m.indications,
        contraindications: m.contraindications,
        usage: m.usage,
        image: m.image,
        rating: m.rating,
        form: m.form,
        mgPerUnit: m.mgPerUnit,
        volumes: m.volumes,
        dosageRules: m.dosageRules,
        inStock: m.inStock === 1,
      }));
    } catch (err) {
      console.error('Error fetching medicines:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async create(body: any) {
    const {
      id, name, categoryId, category, description, fullDescription,
      indications, contraindications, usage, image, rating, form, mgPerUnit, volumes, dosageRules, inStock
    } = body;

    if (!id || !name) {
      throw new BadRequestException('Missing required medicine info');
    }

    const normalizedVolumes = this.normalizeVolumes(volumes);
    if (normalizedVolumes.length === 0) {
      throw new BadRequestException('At least one priced volume is required');
    }

    const resolvedCategoryId = await this.resolveCategoryId(categoryId, category);

    try {
      await this.prisma.medicine.create({
        data: {
          id,
          name,
          categoryId: resolvedCategoryId,
          description: description || { ru: '', en: '', ar: '' },
          fullDescription: fullDescription || { ru: '', en: '', ar: '' },
          indications: indications || { ru: [], en: [], ar: [] },
          contraindications: contraindications || { ru: [], en: [], ar: [] },
          usage: usage || { ru: '', en: '', ar: '' },
          image: image || 'https://images.unsplash.com/photo-1579154204601-01588f351166?w=600&auto=format&fit=crop&q=80',
          rating: Number(rating || 5.0),
          form: form || 'vial',
          mgPerUnit: Number(mgPerUnit || 5),
          volumes: normalizedVolumes,
          dosageRules: dosageRules || { mgPerKgPerDay: 0.005, defaultDailyDoses: 1 },
          inStock: inStock === false ? 0 : 1,
        }
      });
      return { success: true, id };
    } catch (err: any) {
      console.error('Error creating medicine:', err);
      throw new InternalServerErrorException(err.message || 'Database error occurred');
    }
  }

  async update(id: string, body: any) {
    const {
      name, categoryId, category, description, fullDescription,
      indications, contraindications, usage, image, rating, form, mgPerUnit, volumes, dosageRules, inStock
    } = body;

    const normalizedVolumes = this.normalizeVolumes(volumes);
    if (normalizedVolumes.length === 0) {
      throw new BadRequestException('At least one priced volume is required');
    }

    const resolvedCategoryId = await this.resolveCategoryId(categoryId, category);

    try {
      const before = await this.prisma.medicine.findUnique({ where: { id } });
      const newInStock = inStock ? 1 : 0;

      await this.prisma.medicine.update({
        where: { id },
        data: {
          name,
          categoryId: resolvedCategoryId,
          description,
          fullDescription,
          indications,
          contraindications,
          usage,
          image,
          rating: Number(rating),
          form,
          mgPerUnit: Number(mgPerUnit),
          volumes: normalizedVolumes,
          dosageRules,
          inStock: newInStock,
        }
      });

      if (before && before.inStock === 0 && newInStock === 1) {
        await this.notificationsService.notifyRestock(id, name);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error updating medicine:', err);
      throw new InternalServerErrorException(err.message || 'Database error occurred');
    }
  }

  async delete(id: string) {
    try {
      await this.prisma.medicine.delete({
        where: { id },
      });
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting medicine:', err);
      throw new InternalServerErrorException(err.message || 'Database error occurred');
    }
  }
}
