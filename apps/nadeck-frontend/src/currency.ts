/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, Product, ProductVolume, ProductUnit } from './types';
import { MARKET } from './market';

// Cyrillic display label for a product's measurement unit.
const UNIT_LABELS: Record<ProductUnit, string> = { mg: 'мг', ml: 'мл', pcs: 'шт' };
export function unitLabel(unit: ProductUnit): string {
  return UNIT_LABELS[unit] || 'мг';
}

// Currency follows language, but which currency a given language maps to depends on the
// market (build-time site) this bundle serves:
// - 'main' (nadeck.net): Russian shows tenge (₸), everything else shows dollars ($).
// - 'ar' (ar.nadeck.net): Arabic shows Saudi riyals (SAR), English shows dollars ($).
// A missing price in the target currency is stored as 0 (not undefined), so fall back on
// falsy, not just nullish - otherwise an unpriced volume would display a literal "0" instead
// of falling through to the next-best currency (SAR -> USD -> KZT, USD -> KZT).
export function resolvePrice(kzt: number, usd: number | undefined, sar: number | undefined, lang: Language): number {
  if (MARKET === 'ar') {
    return lang === 'ar' ? (sar || usd || kzt) : (usd || kzt);
  }
  return lang === 'ru' ? kzt : (usd || kzt);
}

// A product no longer carries its own price - it's always tied to a specific volume (mg
// strength for peptides, pack size for additional goods), so every consumer resolves "the"
// price through the volume matching mgPerUnit (peptides) or just the first one (everything else).
export function getPrimaryVolume(product: Product): ProductVolume {
  const volumes = product.volumes || [];
  return volumes.find((v) => v.mgPerUnit === product.mgPerUnit) || volumes[0] || { mgPerUnit: product.mgPerUnit ?? 0, price: 0, priceUsd: 0, priceSar: 0 };
}

// Flat delivery fee rules, kept per currency since the free-delivery threshold isn't a
// straight FX conversion of the KZT figure. SAR has no threshold - ar.nadeck.net delivery is
// always the flat 50 SAR fee, by business decision (see CartView's getDeliveryCostForCurrency).
export const FREE_DELIVERY_THRESHOLD = { kzt: 15000, usd: 50 };
export const DELIVERY_COST = { kzt: 1500, usd: 5, sar: 50 };
