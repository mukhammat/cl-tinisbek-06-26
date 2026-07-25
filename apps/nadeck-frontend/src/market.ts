/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, LanguageConfig, SUPPORTED_LANGUAGES } from './types';

// Set at build time (Dockerfile builds this bundle twice, once per market) - see
// apps/nadeck-frontend/Dockerfile and nginx.conf for how each market's dist/ is served
// under its own domain.
export type Market = 'main' | 'ar';

interface MarketConfig {
  defaultLang: Language;
  availableLanguages: Language[];
  contactPhone: string;
  contactPhoneHref: string;
}

// TODO: contactPhone/contactPhoneHref for the 'ar' market are placeholders (same number as
// 'main') until a dedicated number for the Arabic-audience site is available - swap here.
const MARKET_CONFIGS: Record<Market, MarketConfig> = {
  main: {
    defaultLang: 'ru',
    availableLanguages: ['ru', 'en'],
    contactPhone: '+7 (707) 022-23-12',
    contactPhoneHref: 'tel:+77070222312',
  },
  ar: {
    defaultLang: 'ar',
    availableLanguages: ['ar', 'en'],
    contactPhone: '+7 (707) 022-23-12',
    contactPhoneHref: 'tel:+77070222312',
  },
};

const MARKET: Market = import.meta.env.VITE_MARKET === 'ar' ? 'ar' : 'main';

export const currentMarket = MARKET_CONFIGS[MARKET];

// Language switcher / footer list order follows availableLanguages (e.g. Arabic-first on the
// 'ar' market), not SUPPORTED_LANGUAGES' fixed ru/en/ar order.
export const marketLanguages: LanguageConfig[] = currentMarket.availableLanguages
  .map((code) => SUPPORTED_LANGUAGES.find((lang) => lang.code === code))
  .filter((lang): lang is LanguageConfig => Boolean(lang));
