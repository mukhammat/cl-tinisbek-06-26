/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, Medicine, MedicineVolume } from './types';

// Russian UI shows tenge (₸), every other supported language shows dollars ($).
// A missing USD price is stored as 0 (not undefined), so fall back on falsy, not just nullish -
// otherwise unpriced volumes would display a literal "$0" instead of the tenge figure.
export function resolvePrice(kzt: number, usd: number | undefined, lang: Language): number {
  return lang === 'ru' ? kzt : (usd || kzt);
}

// Medicine no longer carries its own price - it's always tied to a specific mg strength, so
// every consumer resolves "the" price through the volume matching the vial's default strength.
export function getPrimaryVolume(medicine: Medicine): MedicineVolume {
  const volumes = medicine.volumes || [];
  return volumes.find((v) => v.mgPerUnit === medicine.mgPerUnit) || volumes[0] || { mgPerUnit: medicine.mgPerUnit, price: 0, priceUsd: 0 };
}

// Flat delivery fee rules, kept in both currencies since the free-delivery threshold
// isn't a straight FX conversion of the KZT figure.
export const FREE_DELIVERY_THRESHOLD = { kzt: 15000, usd: 50 };
export const DELIVERY_COST = { kzt: 1500, usd: 5 };
