/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'ru' | 'en' | 'ar';

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

export type DosageFrequency = 'daily' | 'twice_daily' | 'every_other_day' | 'weekly' | 'custom';

export interface MedicineVolume {
  mgPerUnit: number;
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

export interface Medicine {
  id: string;
  name: Record<Language, string>;
  category: string; // category id from database
  description: Record<Language, string>;
  fullDescription: Record<Language, string>;
  indications: Record<Language, string[]>;
  contraindications: Record<Language, string[]>;
  usage: Record<Language, string>;
  image: string;
  rating: number;
  form: 'tablet' | 'capsule' | 'liquid' | 'vial';
  mgPerUnit: number; // e.g. 5 for 5mg vial (default/primary volume)
  volumes: MedicineVolume[]; // all available package volumes; the price lives here, per volume (see getPrimaryVolume)
  dosageRules: {
    mgPerKgPerDay: number; // Dosage factor
    defaultDailyDoses: number; // times per day
    defaultFrequency?: DosageFrequency; // administration schedule shown by default in the calculator
    customIntervalDays?: number; // only meaningful when defaultFrequency === 'custom': e.g. 20 for "once every 20 days"
  };
  inStock?: boolean;
}

export interface AppNotification {
  id: string;
  medicineId: string;
  message: Record<Language, string>;
  createdAt: string;
  read: boolean;
}

export interface CartItem {
  medicine: Medicine;
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
