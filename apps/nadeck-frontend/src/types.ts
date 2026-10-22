/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'ru' | 'en';

export interface LanguageConfig {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' }
];

// Name of each language (rows) as written in each UI language (columns) - e.g. how to label
// "English" when the page itself is currently displayed in Russian ('Английский', not 'English').
export const LANGUAGE_NAME_TRANSLATIONS: Record<Language, Record<Language, string>> = {
  ru: { ru: 'Русский', en: 'Russian' },
  en: { ru: 'Английский', en: 'English' }
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
  // Confirmed with the code mailed after registration; only a mark, nothing is blocked without it
  emailVerified?: boolean;
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
    country?: string; // DeliveryCountry code, absent on orders placed before countries existed
    city: string;
    street: string;
    apartment: string;
    postalCode: string;
    // Only orders placed through the Telegram bot carry these - the site hands the customer
    // over to WhatsApp instead of storing their contacts.
    name?: string;
    phone?: string;
    telegram?: string;
  };
  paymentMethod: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  // Promo code applied at checkout, if any. The totalPrice* above are already net of the discount.
  promoCode?: string | null;
  discountPercent?: number;
  discountKzt?: number;
  discountUsd?: number;
  userEmail?: string;
  // Admin list only: null when there is no account behind the order (guest, Telegram)
  userEmailVerified?: boolean | null;
}

// A shipping destination, priced per currency in the admin panel. There is no free-delivery
// tier - every country charges its flat fee.
export interface DeliveryCountry {
  code: string; // ISO 3166-1 alpha-2, uppercase
  name: Record<Language, string>;
  priceKzt: number;
  priceUsd: number;
  isActive: boolean;
  sortOrder: number;
}

// A code given to a partner, whose clients get discountPercent off the goods subtotal.
// What /api/promo-codes/validate returns when the shopper's code is usable.
export interface AppliedPromo {
  code: string;
  discountPercent: number;
  partnerName: string;
}

// Why a code was refused - the cart turns this into a localized message.
export type PromoRejection = 'not_found' | 'inactive' | 'expired' | 'exhausted';

// A promo code row in the admin panel, with the numbers the partner is judged on.
export interface PromoCodeStats {
  code: string;
  partnerName: string;
  discountPercent: number;
  isActive: boolean;
  maxUses: number | null;
  expiresAt: string | null;
  createdAt: string;
  ordersCount: number;
  // Distinct signed-in customers plus every guest order counted on its own - guest checkouts
  // share one email and can't be told apart.
  customersCount: number;
  registeredCustomers: number;
  guestOrders: number;
  revenueKzt: number;
  revenueUsd: number;
  discountGivenKzt: number;
}

// ----- admin analytics dashboard (GET /api/admin/analytics) -----

// The three ways of counting traffic, used for the period totals, the previous period and
// each column of the chart: people (distinct browsers), visits (a session, i.e. browsing with
// no 30-minute gap) and raw screen opens.
export interface TrafficCounts {
  visitors: number;
  visits: number;
  pageViews: number;
}

export interface AnalyticsDay extends TrafficCounts {
  date: string; // YYYY-MM-DD
  orders: number;
}

// One row of the "top pages / devices / languages / countries" breakdowns.
export interface AnalyticsBreakdown {
  key: string;
  views: number;
  visitors: number;
}

export interface AnalyticsSummary {
  days: number;
  generatedAt: string;
  // Distinct visitors whose last page view was under 5 minutes ago.
  online: number;
  totals: TrafficCounts & { orders: number; revenueKzt: number; revenueUsd: number };
  // The equally long period right before this one, so every tile can show a trend.
  previous: TrafficCounts & { orders: number; revenueKzt: number; revenueUsd: number };
  today: TrafficCounts & { orders: number };
  daily: AnalyticsDay[];
  topProducts: {
    id: string;
    name: Record<Language, string> | null; // null = the product has been deleted since
    image: string | null;
    views: number;
    visitors: number;
  }[];
  topPages: AnalyticsBreakdown[];
  // Counted once per visit (the site the visitor landed from), not per page view.
  referrers: { source: string; visits: number }[];
  devices: AnalyticsBreakdown[];
  languages: AnalyticsBreakdown[];
  countries: AnalyticsBreakdown[];
}

// A video in the feed or a photo in the gallery under the catalog (GET /api/media-feed).
export interface MediaItem {
  id: string;
  kind: 'video' | 'photo';
  title: Record<Language, string>;
  src: string;
  poster: string | null;
  sortOrder: number;
  isActive: boolean;
}

// A customer review in the carousel under the photo gallery (GET /api/reviews).
export interface Review {
  id: string;
  author: string;
  text: string;
  rating: number;
  date: string; // YYYY-MM-DD
  isVerified: boolean;
  sortOrder: number;
  isActive: boolean;
}
