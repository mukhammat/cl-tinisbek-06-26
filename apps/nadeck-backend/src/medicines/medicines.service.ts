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
type ProductUnit = 'mg' | 'ml' | 'pcs';

@Injectable()
export class MedicinesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  // Normalizes the admin-submitted volumes list into { mgPerUnit, price, priceUsd } triples,
  // dropping anything invalid. priceUsd defaults to 0 (unset).
  private normalizeVolumes(volumes: any): ProductVolume[] {
    if (!Array.isArray(volumes)) return [];
    return volumes
      .map((v) => ({ mgPerUnit: Number(v?.mgPerUnit), price: Number(v?.price), priceUsd: Number(v?.priceUsd || 0) }))
      .filter((v) => Number.isFinite(v.mgPerUnit) && v.mgPerUnit > 0 && Number.isFinite(v.price) && v.price >= 0 && Number.isFinite(v.priceUsd) && v.priceUsd >= 0);
  }

  private resolveProductType(type: any): ProductType {
    return type === 'additional_good' ? 'additional_good' : 'peptide';
  }

  private resolveProductUnit(unit: any): ProductUnit {
    return unit === 'ml' || unit === 'pcs' ? unit : 'mg';
  }

  // Product ids are generated from the name, not typed by an admin. They're primary keys that
  // never appear in a URL, so the only reason to keep them readable rather than random is that
  // an id is what an order row, an export or a log line shows.
  private slugify(value: string): string {
    const cyrillic: Record<string, string> = {
      а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
      й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
      у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
      э: 'e', ю: 'yu', я: 'ya',
    };
    return (value || '')
      .toLowerCase()
      .replace(/[а-яё]/g, (char) => cyrillic[char] ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '');
  }

  // Turns a localized name into an id that isn't taken yet (-2, -3, ...). A name with nothing
  // transliterable falls back to a random id so saving never fails on it.
  private async generateProductId(name: any): Promise<string> {
    const root = this.slugify(name?.en || name?.ru) || `product-${Math.random().toString(36).slice(2, 8)}`;
    const taken = new Set(
      (await this.prisma.product.findMany({ where: { id: { startsWith: root } }, select: { id: true } }))
        .map((p) => p.id),
    );
    if (!taken.has(root)) return root;
    for (let suffix = 2; suffix < 1000; suffix += 1) {
      const candidate = `${root}-${suffix}`;
      if (!taken.has(candidate)) return candidate;
    }
    return `${root}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private normalizeImages(images: any): string[] {
    if (!Array.isArray(images)) return [];
    return images.filter((url) => typeof url === 'string' && url.trim().length > 0);
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
      unit: p.unit as ProductUnit,
      description: p.description,
      fullDescription: p.fullDescription,
      images: this.normalizeImages(p.images),
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
      const rows = await this.prisma.product.findMany({ include: { medicine: true, additionalGood: true } });
      return rows.map((p) => this.flatten(p));
    } catch (err) {
      console.error('Error fetching medicines:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async create(body: any) {
    const {
      id, name, categoryId, category, description, fullDescription,
      indications, contraindications, usage, images, rating, form, mgPerUnit, volumes, dosageRules, inStock, type, unit
    } = body;

    if (!name) {
      throw new BadRequestException('Missing required medicine info');
    }

    // The admin panel derives the id from the name and sends it along; anything else calling
    // this endpoint can omit it and let the name decide. If the id is already taken, generating
    // a fresh one beats failing the save on a primary key nobody chose deliberately.
    const requestedId = typeof id === 'string' ? id.trim().toLowerCase() : '';
    const requestedIdIsFree = requestedId
      && !(await this.prisma.product.findUnique({ where: { id: requestedId }, select: { id: true } }));
    const productId = requestedIdIsFree ? requestedId : await this.generateProductId(name);

    const productType = this.resolveProductType(type);
    const productUnit = this.resolveProductUnit(unit);
    const normalizedVolumes = this.normalizeVolumes(volumes);
    if (normalizedVolumes.length === 0) {
      throw new BadRequestException('At least one priced volume is required');
    }
    const normalizedImages = this.normalizeImages(images);
    if (normalizedImages.length === 0) {
      throw new BadRequestException('At least one product image is required');
    }
    const resolvedCategoryId = await this.resolveCategoryId(categoryId, category);

    try {
      await this.prisma.product.create({
        data: {
          id: productId,
          type: productType,
          unit: productUnit,
          name,
          categoryId: resolvedCategoryId,
          description: description || { ru: '', en: '' },
          fullDescription: fullDescription || { ru: '', en: '' },
          images: normalizedImages,
          rating: Number(rating || 5.0),
          inStock: inStock === false ? 0 : 1,
          ...(productType === 'peptide'
            ? {
                medicine: {
                  create: {
                    indications: indications || { ru: [], en: [] },
                    contraindications: contraindications || { ru: [], en: [] },
                    usage: usage || { ru: '', en: '' },
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
      return { success: true, id: productId };
    } catch (err: any) {
      console.error('Error creating medicine:', err);
      throw new InternalServerErrorException(err.message || 'Database error occurred');
    }
  }

  async update(id: string, body: any) {
    const {
      name, categoryId, category, description, fullDescription,
      indications, contraindications, usage, images, rating, form, mgPerUnit, volumes, dosageRules, inStock, type, unit
    } = body;

    const productType = this.resolveProductType(type);
    const productUnit = this.resolveProductUnit(unit);
    const normalizedVolumes = this.normalizeVolumes(volumes);
    if (normalizedVolumes.length === 0) {
      throw new BadRequestException('At least one priced volume is required');
    }
    const normalizedImages = this.normalizeImages(images);
    if (normalizedImages.length === 0) {
      throw new BadRequestException('At least one product image is required');
    }

    const before = await this.prisma.product.findUnique({ where: { id } });
    const resolvedCategoryId = await this.resolveCategoryId(categoryId, category);

    try {
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
          unit: productUnit,
          name,
          categoryId: resolvedCategoryId,
          description,
          fullDescription,
          images: normalizedImages,
          rating: Number(rating),
          inStock: newInStock,
          ...(productType === 'peptide'
            ? {
                medicine: {
                  upsert: {
                    create: {
                      indications: indications || { ru: [], en: [] },
                      contraindications: contraindications || { ru: [], en: [] },
                      usage: usage || { ru: '', en: '' },
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
