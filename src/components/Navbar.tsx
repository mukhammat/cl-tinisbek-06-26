/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, User, CartItem, SUPPORTED_LANGUAGES } from '../types';
import { TRANSLATIONS } from '../data';
import { ShoppingCart, Calculator, User as UserIcon, LogIn, Search, Heart, Plus } from 'lucide-react';

interface NavbarProps {
  currentLang: Language;
  setLang: (lang: Language) => void;
  activeTab: 'catalog' | 'calculator' | 'orders';
  setActiveTab: (tab: 'catalog' | 'calculator' | 'orders') => void;
  user: User;
  setAuthModalOpen: (open: boolean) => void;
  cart: CartItem[];
  setCartOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function Navbar({
  currentLang,
  setLang,
  activeTab,
  setActiveTab,
  user,
  setAuthModalOpen,
  cart,
  setCartOpen,
  searchQuery,
  setSearchQuery
}: NavbarProps) {
  
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const t = (key: string) => {
    return TRANSLATIONS[key]?.[currentLang] || key;
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-100 shadow-sm" id="main-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Brand Logo and Name */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none shrink-0" 
            onClick={() => { setActiveTab('catalog'); setSearchQuery(''); }}
            id="brand-logo"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-teal-100">
              ✚
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-950 leading-none tracking-tight">
                {t('appName')}
              </h1>
              <span className="text-[10px] text-slate-500 font-medium">
                {t('appSubtitle')}
              </span>
            </div>
          </div>

          {/* Core Navigation - Desktop/Tablet */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-xl" id="nav-tabs">
            <button
              id="tab-catalog"
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'catalog'
                  ? 'bg-white text-teal-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              {t('homeTab')}
            </button>
            <button
              id="tab-calculator"
              onClick={() => setActiveTab('calculator')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'calculator'
                  ? 'bg-white text-teal-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              <Calculator className="w-4 h-4 text-teal-600" />
              {t('calcTab')}
            </button>
            <button
              id="tab-orders"
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'orders'
                  ? 'bg-white text-teal-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              {t('ordersTab')}
            </button>
          </nav>

          {/* Search Bar - hidden on mobile, responsive inside header */}
          {activeTab === 'catalog' && (
            <div className="hidden sm:flex items-center flex-1 max-w-sm relative" id="search-box">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                id="search-input"
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-1.5 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:border-teal-500 focus:outline-none transition-all duration-200"
              />
            </div>
          )}

          {/* Controls Right */}
          <div className="flex items-center gap-2.5 sm:gap-4 ml-auto shrink-0" id="controls-right">
            
            {/* Language Selection Selector */}
            <div className="relative" id="lang-selector">
              <select
                id="lang-select"
                value={currentLang}
                onChange={(e) => setLang(e.target.value as Language)}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 pr-6 cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.code.toUpperCase()}
                  </option>
                ))}
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] pointer-events-none text-slate-400">▼</span>
            </div>

            {/* Shopping Cart Trigger */}
            <button
              id="btn-cart-trigger"
              onClick={() => setCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/50 transition-all duration-200 group"
            >
              <ShoppingCart className="w-5 h-5 group-hover:scale-105 transition-transform" />
              {cartCount > 0 && (
                <span id="cart-badge" className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse border-2 border-white">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Profile / Login trigger */}
            <button
              id="btn-auth-trigger"
              onClick={() => setAuthModalOpen(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 ${
                user.isAuthenticated 
                  ? 'bg-teal-50 border-teal-200 text-teal-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <UserIcon id="user-icon-navbar" className="w-4 h-4 text-teal-600" />
              <span id="user-name-navbar" className="hidden lg:block text-xs font-semibold max-w-[120px] truncate">
                {user.isAuthenticated ? user.fullName : t('loginBtn')}
              </span>
            </button>

          </div>
        </div>

        {/* Mobile quick utility links (since tabs are hidden) */}
        <div className="flex md:hidden border-t border-slate-100 py-2.5 justify-around items-center" id="mobile-nav-tabs">
          <button
            id="mobile-tab-catalog"
            onClick={() => { setActiveTab('catalog'); }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
              activeTab === 'catalog' ? 'text-teal-600 bg-teal-50' : 'text-slate-500'
            }`}
          >
            {t('homeTab')}
          </button>
          <button
            id="mobile-tab-calculator"
            onClick={() => { setActiveTab('calculator'); }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 ${
              activeTab === 'calculator' ? 'text-teal-600 bg-teal-50' : 'text-slate-500'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            {t('calcTab')}
          </button>
          <button
            id="mobile-tab-orders"
            onClick={() => { setActiveTab('orders'); }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
              activeTab === 'orders' ? 'text-teal-600 bg-teal-50' : 'text-slate-500'
            }`}
          >
            {t('ordersTab')}
          </button>
        </div>

        {/* Search bar on small mobile screens if on catalog */}
        {activeTab === 'catalog' && (
          <div className="block sm:hidden pb-3 relative" id="mobile-search-box">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-3.5 h-3.5" />
            <input
              id="mobile-search-input"
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>
        )}
      </div>
    </header>
  );
}
