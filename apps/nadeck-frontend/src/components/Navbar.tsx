/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Language, User, CartItem, AppNotification, SUPPORTED_LANGUAGES } from '../types';
import { TRANSLATIONS } from '../data';
import { ShoppingCart, User as UserIcon, Bell, Menu } from 'lucide-react';
import nadeckIcon from '../assets/nadeck-icon.png';
import SideMenu from './SideMenu';

interface NavbarProps {
  currentLang: Language;
  setLang: (lang: Language) => void;
  activeTab: 'catalog' | 'calculator' | 'cart' | 'orders' | 'admin';
  setActiveTab: (tab: 'catalog' | 'calculator' | 'cart' | 'orders' | 'admin') => void;
  user: User;
  setAuthModalOpen: (open: boolean) => void;
  cart: CartItem[];
  setCartOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  // Which landing-page blocks have content, for the side menu's links to them.
  sections: { videos: boolean; photos: boolean; reviews: boolean };
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
  setSearchQuery,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  sections
}: NavbarProps) {

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const t = (key: string) => {
    return TRANSLATIONS[key]?.[currentLang] || key;
  };

  return (
    <>
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-100 shadow-sm" id="main-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 sm:h-20 gap-3 sm:gap-4">

          {/* Burger: catalog, calculator, orders, search and the rest live in the side menu */}
          <button
            type="button"
            id="btn-menu"
            onClick={() => setMenuOpen(true)}
            aria-label={currentLang === 'ru' ? 'Открыть меню' : 'Open menu'}
            aria-expanded={menuOpen}
            className="w-11 h-11 -ms-2 flex items-center justify-center shrink-0 text-slate-900"
          >
            <Menu className="w-7 h-7" strokeWidth={1.75} />
          </button>

          {/* Brand Logo and Name */}
          <div
            className="flex items-center gap-1 cursor-pointer select-none shrink-0"
            onClick={() => { setActiveTab('catalog'); setSearchQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            id="brand-logo"
          >
            <div className="w-10 h-10 flex items-center justify-center">
              <img src={nadeckIcon} alt="Nadeck" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-950 leading-none tracking-tight">
                {t('appName')}
              </h1>
            </div>
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-2.5 sm:gap-4 ms-auto shrink-0" id="controls-right">

            {/* Language - desktop; on phones it lives in the burger menu */}
            <div className="relative hidden md:block" id="lang-selector">
              <select
                id="lang-select"
                value={currentLang}
                onChange={(e) => setLang(e.target.value as Language)}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-nadeck-500 pe-6 cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.code.toUpperCase()}
                  </option>
                ))}
              </select>
              <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[9px] pointer-events-none text-slate-400">▼</span>
            </div>

            {/* Notifications Bell Trigger */}
            {user.isAuthenticated && (
              <div className="relative" id="notif-bell-wrapper">
                <button
                  id="btn-notif-trigger"
                  onClick={() => setNotifPanelOpen((prev) => !prev)}
                  className={`relative p-2.5 rounded-xl border transition-all duration-200 group ${
                    notifPanelOpen
                      ? 'bg-nadeck-50 border-nadeck-300 text-nadeck-700'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/50'
                  }`}
                >
                  <Bell className="w-5 h-5 group-hover:scale-105 transition-transform" />
                  {unreadCount > 0 && (
                    <span id="notif-badge" className="absolute -top-1.5 -end-1.5 bg-rose-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifPanelOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifPanelOpen(false)} />
                    <div id="notif-dropdown-panel" className="absolute end-0 top-full mt-2 w-80 max-w-[90vw] bg-white rounded-2xl border border-slate-100 shadow-xl z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">{t('notificationsTitle')}</h4>
                        {unreadCount > 0 && (
                          <button
                            onClick={onMarkAllNotificationsRead}
                            className="text-[10px] font-bold text-nadeck-600 hover:text-nadeck-800"
                          >
                            {t('markAllReadBtn')}
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                        {notifications.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-8 px-4">{t('notificationsEmpty')}</p>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => !n.read && onMarkNotificationRead(n.id)}
                              className={`w-full text-start px-4 py-3 text-xs flex items-start gap-2.5 transition ${
                                n.read ? 'bg-white text-slate-500' : 'bg-nadeck-50/40 text-slate-800 font-semibold hover:bg-nadeck-50/70'
                              }`}
                            >
                              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-nadeck-500 mt-1.5 shrink-0" />}
                              <span className="leading-relaxed">{n.message[currentLang] || n.message.en}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Shopping Cart Trigger */}
            <button
              id="btn-cart-trigger"
              onClick={() => setActiveTab('cart')}
              className={`relative p-2.5 rounded-xl border transition-all duration-200 group ${
                activeTab === 'cart'
                  ? 'bg-nadeck-50 border-nadeck-300 text-nadeck-700'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/50'
              }`}
            >
              <ShoppingCart className="w-5 h-5 group-hover:scale-105 transition-transform" />
              {cartCount > 0 && (
                <span id="cart-badge" className="absolute -top-1.5 -end-1.5 bg-rose-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse border-2 border-white">
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
                  ? 'bg-nadeck-50 border-nadeck-200 text-nadeck-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <UserIcon id="user-icon-navbar" className="w-4 h-4 text-nadeck-600" />
              {!user.isAuthenticated && (
                <span id="user-name-navbar" className="hidden lg:block text-xs font-semibold max-w-[120px] truncate">
                  {t('loginBtn')}
                </span>
              )}
            </button>

          </div>
        </div>
      </div>
    </header>

    <SideMenu
      open={menuOpen}
      onClose={() => setMenuOpen(false)}
      currentLang={currentLang}
      setLang={setLang}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      setAuthModalOpen={setAuthModalOpen}
      cartCount={cartCount}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      sections={sections}
    />
    </>
  );
}
