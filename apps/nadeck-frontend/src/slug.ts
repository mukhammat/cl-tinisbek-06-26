/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Product/category ids are generated from the name instead of being typed by hand in the
// admin panel. They never appear in a URL (the storefront is a single page), so the only
// reason to keep them readable rather than random is that an id is what shows up in order
// rows, exports and server logs.

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

/**
 * "Семаглутид 5 мг" -> "semaglutid-5-mg". Latin letters/digits and hyphens only: Cyrillic is
 * transliterated, accents are stripped, everything else collapses into a single hyphen.
 * Returns '' when the name has nothing transliterable (e.g. Arabic only) - callers fall back
 * to a generated id in that case.
 */
export const slugify = (value: string): string =>
  (value || '')
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => CYRILLIC_MAP[char] ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');

/**
 * Makes `base` unique against ids already in the catalog by appending -2, -3, ... An empty or
 * fully non-latin base falls back to a random id so saving never blocks on the name.
 */
export const uniqueSlug = (base: string, takenIds: Iterable<string>): string => {
  const taken = new Set(Array.from(takenIds, (id) => id.toLowerCase()));
  const root = slugify(base) || `item-${Math.random().toString(36).slice(2, 8)}`;
  if (!taken.has(root)) return root;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${root}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${Math.random().toString(36).slice(2, 8)}`;
};
