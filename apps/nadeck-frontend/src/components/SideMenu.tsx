/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Calculator, ChevronRight, Film, MessageSquareQuote, Image as ImageIcon, LayoutGrid, Package, Search, ShoppingCart, User as UserIcon, X } from 'lucide-react';
import { Language, SUPPORTED_LANGUAGES, User } from '../types';
import { TRANSLATIONS } from '../data';
import nadeckIcon from '../assets/nadeck-icon.png';

const PHONE = '+7 (707) 022-23-12';
const WHATSAPP_NUMBER = '77070222312';

type Tab = 'catalog' | 'calculator' | 'cart' | 'orders' | 'admin';

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  currentLang: Language;
  setLang: (lang: Language) => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  user: User;
  setAuthModalOpen: (open: boolean) => void;
  cartCount: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  // Which landing-page blocks exist: each is hidden on the site until the admin adds content,
  // so its menu item would scroll to nothing.
  sections: { videos: boolean; photos: boolean; reviews: boolean };
}

// The burger menu: a white panel sliding in from the left with every place on the site.
export default function SideMenu({
  open,
  onClose,
  currentLang,
  setLang,
  activeTab,
  setActiveTab,
  user,
  setAuthModalOpen,
  cartCount,
  searchQuery,
  setSearchQuery,
  sections,
}: SideMenuProps) {
  const t = (key: string) => TRANSLATIONS[key]?.[currentLang] || key;
  const ru = currentLang === 'ru';

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const goTab = (tab: Tab) => {
    setActiveTab(tab);
    onClose();
    window.scrollTo({ top: 0 });
  };

  // Sections of the landing page: switch to the catalog first, then scroll once it has rendered.
  const goSection = (id: string) => {
    setActiveTab('catalog');
    setSearchQuery('');
    onClose();
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  };

  const itemClass = (active = false) =>
    `w-full h-13 py-3 flex items-center gap-3.5 text-[19px] font-light text-start transition-colors ${
      active ? 'text-nadeck-700 font-normal' : 'text-slate-900 hover:text-nadeck-600'
    }`;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]" id="side-menu">
          <motion.div
            className="absolute inset-0 bg-slate-950/50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.nav
            aria-label={ru ? 'Меню' : 'Menu'}
            className="absolute left-0 top-0 bottom-0 w-[82%] max-w-[360px] bg-white shadow-2xl flex flex-col overflow-y-auto"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <button type="button" onClick={() => goTab('catalog')} className="flex items-center" aria-label={ru ? 'На главную' : 'Home'}>
                <img src={nadeckIcon} alt="" className="w-9 h-9 object-contain" />
                <span className="ms-1 text-lg font-bold text-slate-950 tracking-tight">{t('appName')}</span>
              </button>
              <button type="button" onClick={onClose} aria-label={ru ? 'Закрыть меню' : 'Close menu'} className="w-11 h-11 -me-2 flex items-center justify-center text-slate-900">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 pb-3 relative">
              <Search className="absolute start-9 top-1/2 -translate-y-1/2 -mt-1.5 w-4 h-4 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveTab('catalog');
                }}
                onKeyDown={(e) => e.key === 'Enter' && onClose()}
                placeholder={t('searchPlaceholder')}
                className="w-full h-11 ps-10 pe-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-nadeck-500"
              />
            </div>

            <div className="px-6 py-2 divide-y divide-slate-100">
              <button type="button" onClick={() => goTab('catalog')} className={itemClass(activeTab === 'catalog')}>
                <LayoutGrid className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                <span className="flex-1">{ru ? 'Каталог пептидов' : 'Peptide catalog'}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button type="button" onClick={() => goTab('calculator')} className={itemClass(activeTab === 'calculator')}>
                <Calculator className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                <span className="flex-1">{ru ? 'Калькулятор дозировки' : 'Dosage calculator'}</span>
              </button>
              <button type="button" onClick={() => goTab('orders')} className={itemClass(activeTab === 'orders')}>
                <Package className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                <span className="flex-1">{t('ordersTab')}</span>
              </button>
              <button type="button" onClick={() => goTab('cart')} className={itemClass(activeTab === 'cart')}>
                <ShoppingCart className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                <span className="flex-1">{ru ? 'Корзина' : 'Cart'}</span>
                {cartCount > 0 && <span className="min-w-6 h-6 px-1.5 rounded-full bg-nadeck-700 text-white text-xs flex items-center justify-center">{cartCount}</span>}
              </button>
              {sections.videos && (
                <button type="button" onClick={() => goSection('video-feed')} className={itemClass()}>
                  <Film className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                  <span className="flex-1">{ru ? 'Видео' : 'Videos'}</span>
                </button>
              )}
              {sections.photos && (
                <button type="button" onClick={() => goSection('photo-gallery')} className={itemClass()}>
                  <ImageIcon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                  <span className="flex-1">{ru ? 'Фото' : 'Photos'}</span>
                </button>
              )}
              {sections.reviews && (
                <button type="button" onClick={() => goSection('reviews')} className={itemClass()}>
                  <MessageSquareQuote className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                  <span className="flex-1">{ru ? 'Отзывы' : 'Reviews'}</span>
                </button>
              )}
              {user.isAuthenticated && user.isAdmin && (
                <button type="button" onClick={() => goTab('admin')} className={itemClass(activeTab === 'admin')}>
                  <span className="w-5 text-center shrink-0">⚙</span>
                  <span className="flex-1">{ru ? 'Админка' : 'Admin'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setAuthModalOpen(true);
                }}
                className={itemClass()}
              >
                <UserIcon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                <span className="flex-1 truncate">{user.isAuthenticated ? user.fullName : t('loginBtn')}</span>
              </button>
            </div>

            <div className="mt-auto px-6 pt-5 pb-7 space-y-4 border-t border-slate-200">
              <div className="flex gap-2">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLang(lang.code)}
                    className={`h-10 px-4 rounded-full text-sm border ${
                      currentLang === lang.code ? 'bg-nadeck-800 border-nadeck-800 text-white' : 'border-slate-300 text-slate-800'
                    }`}
                  >
                    {lang.code.toUpperCase()}
                  </button>
                ))}
              </div>
              <a href={`tel:+${PHONE.replace(/\D/g, '')}`} className="block text-[15px] text-slate-600">
                {PHONE}
              </a>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 rounded-xl bg-nadeck-800 hover:bg-nadeck-900 text-white flex items-center justify-center text-[15px] font-medium"
              >
                {ru ? 'Написать консультанту' : 'Message a consultant'}
              </a>
            </div>
          </motion.nav>
        </div>
      )}
    </AnimatePresence>
  );
}
