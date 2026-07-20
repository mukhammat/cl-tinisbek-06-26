/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, Product, ProductVolume } from './types';

// Russian UI shows tenge (₸), every other supported language shows dollars ($).
// A missing USD price is stored as 0 (not undefined), so fall back on falsy, not just nullish -
// otherwise unpriced volumes would display a literal "$0" instead of the tenge figure.
export function resolvePrice(kzt: number, usd: number | undefined, lang: Language): number {
  return lang === 'ru' ? kzt : (usd || kzt);
}

// A product no longer carries its own price - it's always tied to a specific volume (mg
// strength for peptides, pack size for additional goods), so every consumer resolves "the"
// price through the volume matching mgPerUnit (peptides) or just the first one (everything else).
export function getPrimaryVolume(product: Product): ProductVolume {
  const volumes = product.volumes || [];
  return volumes.find((v) => v.mgPerUnit === product.mgPerUnit) || volumes[0] || { mgPerUnit: product.mgPerUnit ?? 0, price: 0, priceUsd: 0 };
}

// Flat delivery fee rules, kept in both currencies since the free-delivery threshold
// isn't a straight FX conversion of the KZT figure.
export const FREE_DELIVERY_THRESHOLD = { kzt: 15000, usd: 50 };
export const DELIVERY_COST = { kzt: 1500, usd: 5 };
