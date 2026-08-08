/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Inject, Injectable, BadRequestException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// The one place the fallback category id is defined - every caller resolves through
// resolveCategoryId() below instead of repeating the literal.
const DEFAULT_CATEGORY_ID = 'weightloss';

type ProductVolume = { mgPerUnit: number; price: number; priceUsd: number; priceSar: number };
type ProductType = 'peptide' | 'additional_good';
type ProductUnit = 'mg' | 'ml' | 'pcs';
type Market = 'main' | 'ar';
const VALID_MARKETS: Market[] = ['main', 'ar'];

@Injectable()
export class MedicinesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  // Normalizes the admin-submitted volumes list into { mgPerUnit, price, priceUsd, priceSar }
  // quads, dropping anything invalid. priceSar defaults to 0 (unset) same as priceUsd.
  private normalizeVolumes(volumes: any): ProductVolume[] {
    if (!Array.isArray(volumes)) return [];
    return volumes
      .map((v) => ({ mgPerUnit: Number(v?.mgPerUnit), price: Number(v?.price), priceUsd: Number(v?.priceUsd || 0), priceSar: Number(v?.priceSar || 0) }))
      .filter((v) => Number.isFinite(v.mgPerUnit) && v.mgPerUnit > 0 && Number.isFinite(v.price) && v.price >= 0 && Number.isFinite(v.priceUsd) && v.priceUsd >= 0 && Number.isFinite(v.priceSar) && v.priceSar >= 0);
  }

  private resolveProductType(type: any): ProductType {
    return type === 'additional_good' ? 'additional_good' : 'peptide';
  }

  private resolveProductUnit(unit: any): ProductUnit {
    return unit === 'ml' || unit === 'pcs' ? unit : 'mg';
  }

  // Defaults to ['main'] so a product only shows up on ar.nadeck.net once someone explicitly
  // opts it in, rather than every existing product silently appearing there.
  private normalizeMarkets(markets: any): Market[] {
    const valid = Array.isArray(markets) ? markets.filter((m) => VALID_MARKETS.includes(m)) : [];
    return valid.length > 0 ? Array.from(new Set(valid)) : ['main'];
  }

  // A market-scoped admin's products live only on their own market - this overrides whatever
  // the client sent instead of merely validating it, so a scoped admin can never publish onto
  // (or keep a product visible on) a market they don't have access to.
  private resolveMarkets(markets: any, adminMarket?: string | null): Market[] {
    if (adminMarket && VALID_MARKETS.includes(adminMarket as Market)) {
      return [adminMarket as Market];
    }
    return this.normalizeMarkets(markets);
  }

  // Full admins (adminMarket null) can touch any product; a scoped admin only their own
  // market's products - used before update/delete so they can't act on a product outside it.
  private assertMarketAccess(productMarkets: Market[], adminMarket?: string | null) {
    if (adminMarket && !productMarkets.includes(adminMarket as Market)) {
      throw new ForbiddenException('This product is outside your assigned market');
    }
  }

  private normalizeImages(images: any): string[] {
    if (!Array.isArray(images)) return [];
    return images.filter((url) => typeof url === 'string' && url.trim().length > 0);
  }

  // Each storefront has its own gallery (Product.images for nadeck.net, Product.imagesAr for
  // ar.nadeck.net); whichever one is empty borrows the other's photos, so a product shot only
  // has to be uploaded twice when the two sites genuinely need different pictures.
  private resolveImages(p: any, market: Market): string[] {
    const main = this.normalizeImages(p.images);
    const ar = this.normalizeImages(p.imagesAr);
    return market === 'ar' ? (ar.length > 0 ? ar : main) : (main.length > 0 ? main : ar);
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

  // Same, for ar.nadeck.net's category - optional, so blank means "not filed on the Arabic
  // storefront yet" and resolveCategory() below falls back to the nadeck.net one.
  private async resolveOptionalCategoryId(categoryIdAr: any): Promise<string | null> {
    const resolved = String(categoryIdAr || '').trim();
    if (!resolved) return null;
    const categoryExists = await this.prisma.category.findUnique({ where: { id: resolved } });
    if (!categoryExists) {
      throw new BadRequestException('Selected Arabic category does not exist');
    }
    return resolved;
  }

  // The two storefronts keep separate Category rows, so a product is filed once per market.
  // An unset Arabic category borrows the nadeck.net one - same fallback shape as the galleries,
  // which keeps every product that predates this split behaving exactly as it did before.
  private resolveCategory(p: any, market: Market): string {
    return market === 'ar' ? (p.categoryIdAr || p.categoryId) : p.categoryId;
  }

  // Flattens a Product + its type-specific details row into the single flat shape the
  // frontend has always consumed, so callers never need to know the data is split across
  // tables. Peptide-only fields are simply absent for non-peptide products.
  //
  // `forAdmin` keeps both galleries and both categories raw, because the product form edits
  // each market's separately - a storefront read instead collapses them into the single
  // `images`/`category` that market should show, so no component has to know there are two.
  private flatten(p: any, market: Market, forAdmin: boolean) {
    const base = {
      id: p.id,
      name: p.name,
      category: forAdmin ? p.categoryId : this.resolveCategory(p, market),
      ...(forAdmin ? { categoryAr: p.categoryIdAr || '' } : {}),
      type: p.type as ProductType,
      unit: p.unit as ProductUnit,
      description: p.description,
      fullDescription: p.fullDescription,
      images: forAdmin ? this.normalizeImages(p.images) : this.resolveImages(p, market),
      ...(forAdmin ? { imagesAr: this.normalizeImages(p.imagesAr) } : {}),
      rating: p.rating,
      inStock: p.inStock === 1,
      markets: p.markets,
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

  async getAll(market?: string, forAdmin = false) {
    try {
      const rows = await this.prisma.product.findMany({
        where: VALID_MARKETS.includes(market as Market) ? { markets: { has: market as Market } } : undefined,
        include: { medicine: true, additionalGood: true },
      });
      const readingMarket: Market = VALID_MARKETS.includes(market as Market) ? (market as Market) : 'main';
      return rows.map((p) => this.flatten(p, readingMarket, forAdmin));
    } catch (err) {
      console.error('Error fetching medicines:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async create(body: any, adminMarket?: string | null) {
    const {
      id, name, categoryId, category, categoryIdAr, categoryAr, description, fullDescription,
      indications, contraindications, usage, images, imagesAr, rating, form, mgPerUnit, volumes, dosageRules, inStock, type, unit, markets
    } = body;

    if (!id || !name) {
      throw new BadRequestException('Missing required medicine info');
    }

    const productType = this.resolveProductType(type);
    const productUnit = this.resolveProductUnit(unit);
    const normalizedVolumes = this.normalizeVolumes(volumes);
    if (normalizedVolumes.length === 0) {
      throw new BadRequestException('At least one priced volume is required');
    }
    // One gallery is enough - the other market borrows it (see resolveImages), so only a
    // product with no photo at all anywhere is rejected.
    const normalizedImages = this.normalizeImages(images);
    const normalizedImagesAr = this.normalizeImages(imagesAr);
    if (normalizedImages.length === 0 && normalizedImagesAr.length === 0) {
      throw new BadRequestException('At least one product image is required');
    }

    // A market-scoped admin only ever picks their own storefront's category - the other select
    // isn't rendered for them. `categoryId` is NOT NULL, so an ar-scoped admin's choice fills
    // both columns; the nadeck.net one is never read for a product pinned to the ar market.
    const arCategoryChoice = categoryIdAr ?? categoryAr;
    const resolvedCategoryId = adminMarket === 'ar'
      ? await this.resolveCategoryId(arCategoryChoice, undefined)
      : await this.resolveCategoryId(categoryId, category);
    const resolvedCategoryIdAr = adminMarket === 'main'
      ? null
      : await this.resolveOptionalCategoryId(arCategoryChoice);

    try {
      await this.prisma.product.create({
        data: {
          id,
          type: productType,
          unit: productUnit,
          name,
          categoryId: resolvedCategoryId,
          categoryIdAr: resolvedCategoryIdAr,
          description: description || { ru: '', en: '', ar: '' },
          fullDescription: fullDescription || { ru: '', en: '', ar: '' },
          images: normalizedImages,
          imagesAr: normalizedImagesAr,
          rating: Number(rating || 5.0),
          inStock: inStock === false ? 0 : 1,
          markets: this.resolveMarkets(markets, adminMarket),
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

  async update(id: string, body: any, adminMarket?: string | null) {
    const {
      name, categoryId, category, categoryIdAr, categoryAr, description, fullDescription,
      indications, contraindications, usage, images, imagesAr, rating, form, mgPerUnit, volumes, dosageRules, inStock, type, unit, markets
    } = body;

    const productType = this.resolveProductType(type);
    const productUnit = this.resolveProductUnit(unit);
    const normalizedVolumes = this.normalizeVolumes(volumes);
    if (normalizedVolumes.length === 0) {
      throw new BadRequestException('At least one priced volume is required');
    }
    const normalizedImages = this.normalizeImages(images);
    const normalizedImagesAr = this.normalizeImages(imagesAr);
    if (normalizedImages.length === 0 && normalizedImagesAr.length === 0) {
      throw new BadRequestException('At least one product image is required');
    }

    const before = await this.prisma.product.findUnique({ where: { id } });
    if (before) {
      this.assertMarketAccess(before.markets as Market[], adminMarket);
    }

    // A market-scoped admin owns only their own storefront's gallery and category - the admin form
    // doesn't even render the other market's. Keep whatever is already stored for the market they
    // don't manage, so a payload that omits (or forges) it can't overwrite the other storefront.
    const finalImages = adminMarket === 'ar' && before ? this.normalizeImages(before.images) : normalizedImages;
    const finalImagesAr = adminMarket === 'main' && before ? this.normalizeImages(before.imagesAr) : normalizedImagesAr;
    const finalCategoryId = adminMarket === 'ar' && before
      ? before.categoryId
      : await this.resolveCategoryId(categoryId, category);
    const finalCategoryIdAr = adminMarket === 'main' && before
      ? before.categoryIdAr
      : await this.resolveOptionalCategoryId(categoryIdAr ?? categoryAr);

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
          categoryId: finalCategoryId,
          categoryIdAr: finalCategoryIdAr,
          description,
          fullDescription,
          images: finalImages,
          imagesAr: finalImagesAr,
          rating: Number(rating),
          inStock: newInStock,
          markets: this.resolveMarkets(markets, adminMarket),
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

  async delete(id: string, adminMarket?: string | null) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (existing) {
      this.assertMarketAccess(existing.markets as Market[], adminMarket);
    }

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
