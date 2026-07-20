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

type ProductVolume = { mgPerUnit: number; price: number; priceUsd: number };
type ProductType = 'peptide' | 'additional_good';

@Injectable()
export class MedicinesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  // Normalizes the admin-submitted volumes list into { mgPerUnit, price, priceUsd } triples, dropping anything invalid
  private normalizeVolumes(volumes: any): ProductVolume[] {
    if (!Array.isArray(volumes)) return [];
    return volumes
      .map((v) => ({ mgPerUnit: Number(v?.mgPerUnit), price: Number(v?.price), priceUsd: Number(v?.priceUsd || 0) }))
      .filter((v) => Number.isFinite(v.mgPerUnit) && v.mgPerUnit > 0 && Number.isFinite(v.price) && v.price >= 0 && Number.isFinite(v.priceUsd) && v.priceUsd >= 0);
  }

  private resolveProductType(type: any): ProductType {
    return type === 'additional_good' ? 'additional_good' : 'peptide';
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

  // Flattens a Product + its type-specific details row into the single flat shape the
  // frontend has always consumed, so callers never need to know the data is split across
  // tables. Peptide-only fields are simply absent for non-peptide products.
  private flatten(p: any) {
    const base = {
      id: p.id,
      name: p.name,
      category: p.categoryId,
      type: p.type as ProductType,
      description: p.description,
      fullDescription: p.fullDescription,
      image: p.image,
      rating: p.rating,
      inStock: p.inStock === 1,
    };

    if (p.type === 'peptide' && p.medicine) {
      return {
        ...base,
        indications: p.medicine.indications,
        contraindications: p.medicine.contraindications,
        usage: p.medicine.usage,
        form: p.medicine.form,
        mgPerUnit: p.medicine.mgPerUnit,
        dosageRules: p.medicine.dosageRules,
        volumes: p.medicine.volumes,
      };
    }

    return {
      ...base,
      volumes: p.additionalGood?.volumes || [],
    };
  }

  async getAll() {
    try {
      const rows = await this.prisma.product.findMany({
        include: { medicine: true, additionalGood: true },
      });
      return rows.map((p) => this.flatten(p));
    } catch (err) {
      console.error('Error fetching medicines:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async create(body: any) {
    const {
      id, name, categoryId, category, description, fullDescription,
      indications, contraindications, usage, image, rating, form, mgPerUnit, volumes, dosageRules, inStock, type
    } = body;

    if (!id || !name) {
      throw new BadRequestException('Missing required medicine info');
    }

    const productType = this.resolveProductType(type);
    const normalizedVolumes = this.normalizeVolumes(volumes);
    if (normalizedVolumes.length === 0) {
      throw new BadRequestException('At least one priced volume is required');
    }

    const resolvedCategoryId = await this.resolveCategoryId(categoryId, category);

    try {
      await this.prisma.product.create({
        data: {
          id,
          type: productType,
          name,
          categoryId: resolvedCategoryId,
          description: description || { ru: '', en: '', ar: '' },
          fullDescription: fullDescription || { ru: '', en: '', ar: '' },
          image: image || 'https://images.unsplash.com/photo-1579154204601-01588f351166?w=600&auto=format&fit=crop&q=80',
          rating: Number(rating || 5.0),
          inStock: inStock === false ? 0 : 1,
          ...(productType === 'peptide'
            ? {
                medicine: {
                  create: {
                    indications: indications || { ru: [], en: [], ar: [] },
                    contraindications: contraindications || { ru: [], en: [], ar: [] },
                    usage: usage || { ru: '', en: '', ar: '' },
                    form: form || 'vial',
                    mgPerUnit: Number(mgPerUnit || 5),
                    dosageRules: dosageRules || { mgPerKgPerDay: 0.005, defaultDailyDoses: 1 },
                    volumes: normalizedVolumes,
                  },
                },
              }
            : {
                additionalGood: {
                  create: {
                    volumes: normalizedVolumes,
                  },
                },
              }),
        },
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
      indications, contraindications, usage, image, rating, form, mgPerUnit, volumes, dosageRules, inStock, type
    } = body;

    const productType = this.resolveProductType(type);
    const normalizedVolumes = this.normalizeVolumes(volumes);
    if (normalizedVolumes.length === 0) {
      throw new BadRequestException('At least one priced volume is required');
    }

    const resolvedCategoryId = await this.resolveCategoryId(categoryId, category);

    try {
      const before = await this.prisma.product.findUnique({ where: { id } });
      const newInStock = inStock ? 1 : 0;

      // A product is only ever one type at a time - if the admin switched it, drop the
      // stale details row for the old type before attaching a fresh one for the new type.
      if (before && before.type !== productType) {
        if (before.type === 'peptide') {
          await this.prisma.medicineDetails.deleteMany({ where: { productId: id } });
        } else {
          await this.prisma.additionalGoodDetails.deleteMany({ where: { productId: id } });
        }
      }

      await this.prisma.product.update({
        where: { id },
        data: {
          type: productType,
          name,
          categoryId: resolvedCategoryId,
          description,
          fullDescription,
          image,
          rating: Number(rating),
          inStock: newInStock,
          ...(productType === 'peptide'
            ? {
                medicine: {
                  upsert: {
                    create: {
                      indications: indications || { ru: [], en: [], ar: [] },
                      contraindications: contraindications || { ru: [], en: [], ar: [] },
                      usage: usage || { ru: '', en: '', ar: '' },
                      form: form || 'vial',
                      mgPerUnit: Number(mgPerUnit || 5),
                      dosageRules: dosageRules || { mgPerKgPerDay: 0.005, defaultDailyDoses: 1 },
                      volumes: normalizedVolumes,
                    },
                    update: {
                      indications,
                      contraindications,
                      usage,
                      form,
                      mgPerUnit: Number(mgPerUnit),
                      dosageRules,
                      volumes: normalizedVolumes,
                    },
                  },
                },
              }
            : {
                additionalGood: {
                  upsert: {
                    create: { volumes: normalizedVolumes },
                    update: { volumes: normalizedVolumes },
                  },
                },
              }),
        },
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
      await this.prisma.product.delete({
        where: { id },
      });
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting medicine:', err);
      throw new InternalServerErrorException(err.message || 'Database error occurred');
    }
  }
}
