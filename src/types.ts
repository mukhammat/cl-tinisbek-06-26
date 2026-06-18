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

export interface Medicine {
  id: string;
  name: Record<Language, string>;
  category: string; // e.g., 'painkiller', 'vitamin', 'antiallergic', 'digestive'
  activeSubstance: Record<Language, string>;
  description: Record<Language, string>;
  fullDescription: Record<Language, string>;
  indications: Record<Language, string[]>;
  contraindications: Record<Language, string[]>;
  usage: Record<Language, string>;
  price: number; // in Tengue or Dollars, let's support symbol toggle or local Currency ($ / ₸ / ₽). Let's use ₸ and $!
  image: string;
  rating: number;
  form: 'tablet' | 'capsule' | 'liquid' | 'vial';
  mgPerUnit: number; // e.g. 5 for 5mg vial
  dosageRules: {
    mgPerKgPerDay: number; // Dosage factor
    defaultDailyDoses: number; // times per day
  };
}

export interface CartItem {
  medicine: Medicine;
  quantity: number;
  selectedStrength?: number;
}

export interface User {
  email: string;
  fullName: string;
  phone: string;
  address: string;
  isAuthenticated: boolean;
}

export interface Order {
  id: string;
  date: string;
  items: {
    medicineName: Record<Language, string>;
    price: number;
    quantity: number;
  }[];
  totalPrice: number;
  address: {
    city: string;
    street: string;
    apartment: string;
    postalCode: string;
  };
  paymentMethod: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
}
