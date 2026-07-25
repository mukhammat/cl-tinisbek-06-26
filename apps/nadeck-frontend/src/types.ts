/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'ru' | 'en' | 'ar';

// Which storefront(s) a product is visible on - independent of Language (a product can be
// shown in Arabic translation on nadeck.net too; this controls the site, not the wording).
export type SiteMarket = 'main' | 'ar';

export interface LanguageConfig {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' }
];

// Name of each language (rows) as written in each UI language (columns) - e.g. how to label
// "English" when the page itself is currently displayed in Arabic ('الإنجليزية', not 'English').
export const LANGUAGE_NAME_TRANSLATIONS: Record<Language, Record<Language, string>> = {
  ru: { ru: 'Русский', en: 'Russian', ar: 'الروسية' },
  en: { ru: 'Английский', en: 'English', ar: 'الإنجليزية' },
  ar: { ru: 'Арабский', en: 'Arabic', ar: 'العربية' }
};

export type DosageFrequency = 'daily' | 'twice_daily' | 'every_other_day' | 'weekly' | 'custom';

// 'peptide' carries the clinical/dosing fields below; 'additional_good' is everything else
// (syringes, vitamins, protein, cosmetics, equipment, ...) - a shared bucket until a specific
// kind of good needs fields none of the others do, at which point it earns its own type.
export type ProductType = 'peptide' | 'additional_good';

// Measurement unit the volumes/prices are denominated in. Independent of ProductType - a
// peptide can be mg powder or ml liquid, an additional good can be pcs (syringes) or ml (water).
export type ProductUnit = 'mg' | 'ml' | 'pcs';

export interface ProductVolume {
  mgPerUnit: number; // for peptides: strength in mg. For additional goods: units/pack size.
  price: number; // this volume's own price in KZT (₸), may differ from other volumes of the same product
  priceUsd: number; // this volume's own price in USD ($), shown for non-Russian languages
}

export interface Category {
  id: string;
  name: Record<Language, string>;
  icon?: string | null; // uploaded icon (data URI or URL); falls back to the default red logo mark when unset
  sortOrder: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  type: ProductType;
  unit: ProductUnit;
  name: Record<Language, string>;
  category: string; // category id from database
  description: Record<Language, string>;
  fullDescription: Record<Language, string>;
  images: string[]; // gallery of image URLs; images[0] is the cover photo shown in listings
  rating: number;
  volumes: ProductVolume[]; // all available package volumes; the price lives here, per volume (see getPrimaryVolume)
  inStock?: boolean;
  markets?: SiteMarket[]; // which storefront(s) list this product; defaults to ['main'] server-side

  // Peptide-only fields - present only when type === 'peptide'.
  indications?: Record<Language, string[]>;
  contraindications?: Record<Language, string[]>;
  usage?: Record<Language, string>;
  form?: 'tablet' | 'capsule' | 'liquid' | 'vial';
  mgPerUnit?: number; // e.g. 5 for 5mg vial (default/primary volume)
  dosageRules?: {
    mgPerKgPerDay: number; // Dosage factor
    defaultDailyDoses: number; // times per day
    defaultFrequency?: DosageFrequency; // administration schedule shown by default in the calculator
    customIntervalDays?: number; // only meaningful when defaultFrequency === 'custom': e.g. 20 for "once every 20 days"
  };
}

export interface AppNotification {
  id: string;
  medicineId: string;
  message: Record<Language, string>;
  createdAt: string;
  read: boolean;
}

export interface CartItem {
  medicine: Product;
  quantity: number;
  selectedStrength?: number; // the chosen volume's mgPerUnit
  unitPrice?: number; // resolved KZT price for the chosen volume, falls back to its primary volume's price when absent
  unitPriceUsd?: number; // resolved USD price for the chosen volume, falls back to its primary volume's price when absent
}

export interface User {
  email: string;
  fullName: string;
  phone: string;
  address: string;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  token?: string;
}

export interface Order {
  id: string;
  date: string;
  items: {
    medicineName: Record<Language, string>;
    price: number; // unit price in KZT
    priceUsd: number; // unit price in USD
    quantity: number;
  }[];
  totalPrice: number; // grand total in KZT
  totalPriceUsd: number; // grand total in USD
  address: {
    city: string;
    street: string;
    apartment: string;
    postalCode: string;
  };
  paymentMethod: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
}
