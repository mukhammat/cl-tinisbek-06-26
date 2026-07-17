/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language } from './types';

// Russian UI shows tenge (₸), every other supported language shows dollars ($).
// A missing USD price is stored as 0 (not undefined), so fall back on falsy, not just nullish -
// otherwise unpriced volumes would display a literal "$0" instead of the tenge figure.
export function resolvePrice(kzt: number, usd: number | undefined, lang: Language): number {
  return lang === 'ru' ? kzt : (usd || kzt);
}

// Flat delivery fee rules, kept in both currencies since the free-delivery threshold
// isn't a straight FX conversion of the KZT figure.
export const FREE_DELIVERY_THRESHOLD = { kzt: 15000, usd: 50 };
export const DELIVERY_COST = { kzt: 1500, usd: 5 };
