/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { Language, Product, CartItem, User, Order, AppNotification, Category, LANGUAGE_NAME_TRANSLATIONS } from './types';
import { MEDICINES_DATA, TRANSLATIONS } from './data';
import { currentMarket, marketLanguages, MARKET } from './market';
import Navbar from './components/Navbar';
import MedicineGrid from './components/MedicineGrid';
import MedicineDetail from './components/MedicineDetail';
import DosageCalculator from './components/DosageCalculator';
import CartView from './components/CartView';
import OrderHistory from './components/OrderHistory';
import AuthModal from './components/AuthModal';
import ResearchDisclaimerModal from './components/ResearchDisclaimerModal';
import AIPeptideAdvisor from './components/AIPeptideAdvisor';
import AdminPanel from './components/AdminPanel';
import { ShoppingCart, Calculator, MapPin, Heart, Clock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import nadeckIconWhite from './assets/nadeck-icon-white.png';
import heroBannerBg from './assets/hero-banner-office.png';

export default function App() {
  // Lang state (initializes from localStorage if available, fallback to the current market's default)
  const [currentLang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('pharmacy_lang') as Language | null;
    return saved && currentMarket.availableLanguages.includes(saved) ? saved : currentMarket.defaultLang;
  });

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'catalog' | 'calculator' | 'cart' | 'orders' | 'admin'>('catalog');
  
  // Selected single medicine for details
  const [selectedMedicine, setSelectedMedicine] = useState<Product | null>(null);

  // Selected catalog category so external CTAs can jump straight into a filtered section
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('all');

  // Load medicines list from database, default to empty to allow loading inside Grid
  const [medicinesList, setMedicinesList] = useState<Product[]>([]);
  // Distinguishes "haven't loaded yet" from "loaded and this market legitimately has zero
  // products" - the latter must not fall back to the static demo catalog below.
  const [medicinesLoaded, setMedicinesLoaded] = useState(false);
  // Unfiltered catalog (every market) for the admin panel only - so an admin working from
  // either site can still see/manage products that aren't (yet) visible on that site.
  const [adminMedicinesList, setAdminMedicinesList] = useState<Product[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);

  // Retries a couple of times with backoff before giving up - covers the brief window right
  // after a deploy where the backend container is still restarting/migrating and a single
  // failed request would otherwise strand the page on static fallback data until a manual refresh.
  const fetchWithRetry = (url: string, onSuccess: (data: any) => void, attempt = 0) => {
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Request to ${url} failed`);
        return res.json();
      })
      .then(onSuccess)
      .catch((err) => {
        if (attempt < 5) {
          const delay = Math.min(1000 * 2 ** attempt, 15000);
          setTimeout(() => fetchWithRetry(url, onSuccess, attempt + 1), delay);
        } else {
          console.error(`Error loading ${url} after retries:`, err);
        }
      });
  };

  const fetchMedicinesList = () => {
    fetchWithRetry(`/api/medicines?market=${MARKET}`, (data) => {
      if (Array.isArray(data)) {
        setMedicinesList(data);
        setMedicinesLoaded(true);
      }
    });
  };

  // No market filter - the admin panel manages the whole catalog regardless of which site
  // it's opened from.
  const fetchAdminMedicinesList = () => {
    fetchWithRetry('/api/medicines', (data) => {
      if (Array.isArray(data) && data.length > 0) {
        setAdminMedicinesList(data);
      }
    });
  };

  const fetchCategoriesList = () => {
    fetchWithRetry('/api/categories', (data) => {
      if (Array.isArray(data)) {
        setCategoriesList(data);
      }
    });
  };

  useEffect(() => {
    fetchMedicinesList();
    fetchCategoriesList();
  }, []);

  // Search input query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Shopping Cart items (loads from localStorage)
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('pharmacy_cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Authentication status & Info (loads from localStorage)
  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem('pharmacy_user');
    return saved ? JSON.parse(saved) : {
      email: '',
      fullName: '',
      phone: '',
      address: '',
      isAuthenticated: false
    };
  });

  // Interactive Orders stack (loads from localStorage)
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('pharmacy_orders');
    return saved ? JSON.parse(saved) : [];
  });

  // Stock-notification subscriptions (medicineIds the logged-in user is waiting on)
  const [subscribedIds, setSubscribedIds] = useState<string[]>([]);

  // In-app notifications (e.g. restock alerts) for the logged-in user
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Dialog modals toggling state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const cartOpen = activeTab === 'cart';
  const setCartOpen = (open: boolean) => {
    setActiveTab(open ? 'cart' : 'catalog');
  };

  useEffect(() => {
    if (user.isAdmin) fetchAdminMedicinesList();
  }, [user.isAdmin]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('pharmacy_lang', currentLang);
  }, [currentLang]);

  // Arabic reads right-to-left - flips the whole layout (flex ordering, text alignment) via
  // the `dir` attribute; components that pin things with physical left/right utilities instead
  // of logical ones need their own `rtl:` overrides on top of this.
  useEffect(() => {
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  useEffect(() => {
    localStorage.setItem('pharmacy_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('pharmacy_user', JSON.stringify(user));
    // Sync profile edits with the backend database
    if (user.isAuthenticated && user.email) {
      const controller = new AbortController();
      fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          address: user.address,
        }),
        signal: controller.signal,
      }).catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Error syncing profile:', err);
        }
      });
      return () => controller.abort();
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('pharmacy_orders', JSON.stringify(orders));
  }, [orders]);

  // Handle syncing live orders from backend Database on log in / update
  useEffect(() => {
    if (user.isAuthenticated && user.email) {
      fetch(`/api/orders/${encodeURIComponent(user.email)}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Failed to load orders');
        })
        .then((data) => {
          setOrders(data);
        })
        .catch((err) => console.error('Error fetching orders:', err));
    }
  }, [user.isAuthenticated, user.email]);

  // Fetch the user's pending restock subscriptions
  const fetchSubscriptions = () => {
    if (!user.isAuthenticated || !user.email) {
      setSubscribedIds([]);
      return;
    }
    fetch(`/api/notifications/subscriptions/${encodeURIComponent(user.email)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setSubscribedIds(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching subscriptions:', err));
  };

  // Fetch the user's notification feed
  const fetchNotifications = () => {
    if (!user.isAuthenticated || !user.email) {
      setNotifications([]);
      return;
    }
    fetch(`/api/notifications/${encodeURIComponent(user.email)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error fetching notifications:', err));
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchNotifications();
    if (!user.isAuthenticated) return;
    // Poll periodically so restock alerts show up without a manual refresh
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user.isAuthenticated, user.email]);

  // Subscribe the logged-in user to a "back in stock" alert for a product
  const handleSubscribeNotify = (medicineId: string) => {
    if (!user.isAuthenticated || !user.email) return;
    fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, medicineId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && !data.alreadyInStock) {
          setSubscribedIds((prev) => (prev.includes(medicineId) ? prev : [...prev, medicineId]));
        }
      })
      .catch((err) => console.error('Error subscribing to notifications:', err));
  };

  // Footer newsletter signup
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleNewsletterSubscribe = (e: FormEvent) => {
    e.preventDefault();
    setNewsletterStatus('loading');
    fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newsletterEmail }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Subscribe failed');
        return res.json();
      })
      .then(() => {
        setNewsletterStatus('success');
        setNewsletterEmail('');
      })
      .catch((err) => {
        console.error('Newsletter subscribe error:', err);
        setNewsletterStatus('error');
      });
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    fetch(`/api/notifications/${id}/read`, { method: 'POST' }).catch((err) =>
      console.error('Error marking notification read:', err)
    );
  };

  const handleMarkAllNotificationsRead = () => {
    if (!user.email) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    fetch(`/api/notifications/read-all/${encodeURIComponent(user.email)}`, { method: 'POST' }).catch((err) =>
      console.error('Error marking all notifications read:', err)
    );
  };

  const t = (key: string) => {
    return TRANSLATIONS[key]?.[currentLang] || key;
  };

  const catalogSourceMedicines = medicinesLoaded ? medicinesList : MEDICINES_DATA;

  // Used only until /api/categories has loaded (or if it fails) - derived straight from
  // whatever medicine data is on hand, so it always covers every category id in use.
  const fallbackCategories: Category[] = Array.from(new Set(catalogSourceMedicines.map((medicine) => medicine.category).filter(Boolean)))
    .map((category, index) => {
      const translated = TRANSLATIONS[`cat${category.charAt(0).toUpperCase()}${category.slice(1)}`];
      return {
        id: category,
        name: { ru: translated?.ru || category, en: translated?.en || category, ar: translated?.ar || category },
        sortOrder: index,
        isActive: true,
      };
    });

  // The full category list, including inactive ones, so a medicine's label always resolves
  // even after its category has been deactivated (only filtering/selection should hide it).
  const allCategories = categoriesList.length > 0 ? categoriesList : fallbackCategories;
  const categoryLabelById: Record<string, string> = Object.fromEntries(
    allCategories.map((category) => [category.id, category.name[currentLang] || category.name.en || category.id])
  );

  // Categories offered for filtering/selecting: active only, ordered by the admin-editable sortOrder.
  const activeCategories = allCategories
    .filter((category) => category.isActive !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || categoryLabelById[left.id].localeCompare(categoryLabelById[right.id]));

  const categoryFilters = activeCategories.map((category) => ({ id: category.id, label: categoryLabelById[category.id], icon: category.icon }));
  const categoryIconById: Record<string, string | null | undefined> = Object.fromEntries(
    allCategories.map((category) => [category.id, category.icon])
  );
  const adminCategories = allCategories;

  // Cart operations. Different volumes of the same product carry different prices, so
  // cart lines are keyed by (medicine id + selected volume), not just the product id.
  const handleAddToCart = (medicine: Product, qtyToAdd: number = 1, selectedVolume?: number, unitPrice?: number, unitPriceUsd?: number) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.medicine.id === medicine.id && item.selectedStrength === selectedVolume);
      if (existing) {
        return prevCart.map((item) =>
          item === existing
            ? { ...item, quantity: item.quantity + qtyToAdd }
            : item
        );
      }
      return [...prevCart, { medicine, quantity: qtyToAdd, selectedStrength: selectedVolume, unitPrice, unitPriceUsd }];
    });
  };

  const handleRemoveFromCart = (medId: string, selectedVolume?: number) => {
    setCart((prevCart) => prevCart.filter((item) => !(item.medicine.id === medId && item.selectedStrength === selectedVolume)));
  };

  const handleUpdateQty = (medId: string, updatedQty: number, selectedVolume?: number) => {
    if (updatedQty <= 0) {
      handleRemoveFromCart(medId, selectedVolume);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.medicine.id === medId && item.selectedStrength === selectedVolume ? { ...item, quantity: updatedQty } : item
      )
    );
  };

  const handlePlaceOrder = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
    // Set view to orders to see progress
    setActiveTab('orders');
  };

  const handleLogout = () => {
    setUser({
      email: '',
      fullName: '',
      phone: '',
      address: '',
      isAuthenticated: false
    });
    // Remove orders history to clear user visual profile completely
    setOrders([]);
  };

  const handleHeroGoToCalculator = () => {
    setActiveTab('calculator');
    setSelectedMedicine(null);
  };

  const handleGoToAdditionalGoods = () => {
    setActiveTab('catalog');
    setSelectedMedicine(null);
    setSearchQuery('');
    setSelectedCatalogCategory('additional');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans selection:bg-nadeck-500 selection:text-white" id="main-frame">
      
      {/* Universal Sticky Header Navigation */}
      <Navbar
        currentLang={currentLang}
        setLang={setLang}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedMedicine(null); // Return to default list of drugs
        }}
        user={user}
        setAuthModalOpen={setAuthModalOpen}
        cart={cart}
        setCartOpen={setCartOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
      />

      {/* Primary Dynamic Content Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10" id="main-content-flow">
          
          <div className="space-y-8" id="tab-views-container">
            
            {/* Visual Hero Banner: show only on landing Catalog with NO query filters */}
            {activeTab === 'catalog' && !selectedMedicine && !searchQuery && (
              <div
                className="relative rounded-3xl overflow-hidden text-white p-6 sm:p-10 lg:p-12 border border-nadeck-800 flex flex-col md:flex-row items-center justify-between gap-6 bg-cover bg-center shadow-[0_20px_35px_-5px_rgba(15,23,42,0.15)]"
                style={{ backgroundImage: `url(${heroBannerBg})` }}
                id="hero-banner"
              >
                {/* Darkening overlay for text legibility over the photo */}
                <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />
                {/* Visual back glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(20,184,166,0.15),transparent)] pointer-events-none" />
                
                <div className="space-y-4 max-w-xl z-10">
                  {/* <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded-full">
                    ✔ 3-язычный сервис: RU • EN • AR
                  </span> */}
                  <h2 id="hero-title" className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                    {currentLang === 'ru'
                      ? 'Высококачественные пептиды и аминокислоты для здоровья и развития научного прогресса.'
                      : currentLang === 'ar'
                      ? 'ببتيدات وأحماض أمينية عالية النقاء والجودة لدعم صحتك والمساهمة في التقدم العلمي.'
                      : 'Premium-grade peptides and amino acids for health and the advancement of scientific progress.'}
                  </h2>
                  <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed">
                    {currentLang === 'ru'
                      ? 'Быстрая доставка по всему Казахстану и странам СНГ — от 24 часов.'
                      : currentLang === 'ar'
                      ? 'مع توصيل سريع إلى جميع مدن المملكة العربية السعودية ودول الخليج.'
                      : 'Fast delivery across Kazakhstan and the CIS countries — starting from 24 hours.'}
                  </p>
                  
                  <div className="pt-2 flex flex-wrap gap-2.5 sm:gap-4">
                    <button
                      id="hero-btn-calc"
                      onClick={handleHeroGoToCalculator}
                      className="px-5 py-2.5 bg-nadeck-600 hover:bg-nadeck-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-nadeck-500/10 active:scale-95 transition-all"
                    >
                      <Calculator className="w-4 h-4" />
                      <span>{t('calcTab')}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    {user.isAuthenticated ? (
                      <div className="text-xs text-slate-300 bg-white/10 px-4 py-2.5 rounded-xl border border-white/15 backdrop-blur-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{user.fullName}</span>
                      </div>
                    ) : (
                      <button
                        id="hero-btn-profile"
                        onClick={() => setAuthModalOpen(true)}
                        className="px-4 py-2.5 bg-white hover:bg-slate-50 rounded-xl font-bold text-xs text-nadeck-700 shadow-sm active:scale-95 transition-all duration-300"
                      >
                        {t('loginBtn')} / {t('registerBtn')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Conceptual vector image showcase */}
                <div className="relative shrink-0 hidden md:block w-48 lg:w-56" id="hero-graphics">
                  <div className="w-full aspect-square bg-white/5 rounded-full border border-nadeck-500/20 flex items-center justify-center p-6 animate-spin-slow">
                    <div className="w-full h-full rounded-full bg-nadeck-400/10 flex items-center justify-center">
                      <div className="w-14 h-14 bg-nadeck-500 flex items-center justify-center rounded-3xl shadow-lg p-2.5">
                        <img src={nadeckIconWhite} alt="Nadeck" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Dynamic tabs render switch */}
            <div id="active-tab-container">
              {activeTab === 'catalog' && (
                selectedMedicine ? (
                  /* Single Medicine Detail screen */
                  <MedicineDetail
                    currentLang={currentLang}
                    medicine={selectedMedicine}
                    onBack={() => setSelectedMedicine(null)}
                    cart={cart}
                    onAddToCart={handleAddToCart}
                    user={user}
                    setAuthModalOpen={setAuthModalOpen}
                    subscribedIds={subscribedIds}
                    onSubscribeNotify={handleSubscribeNotify}
                    categoryLabelById={categoryLabelById}
                  />
                ) : (
                  /* Cards Catalog screen */
                  <div className="space-y-6">
                    {/* <div className="flex justify-between items-baseline pb-2 border-b border-slate-100">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        {currentLang === 'ru' ? 'Каталог медицинских товаров' : currentLang === 'ar' ? 'دليل المنتجات الطبية' : 'Pharmacy Drug Catalog'}
                      </h3>
                      <span className="text-xs text-slate-400 font-semibold uppercase">{currentLang === 'ru' ? 'Только оригинал' : 'Certified supply'}</span>
                    </div> */}
                    <MedicineGrid
                      currentLang={currentLang}
                      onSelectMedicine={setSelectedMedicine}
                      cart={cart}
                      onAddToCart={handleAddToCart}
                      searchQuery={searchQuery}
                      allMedicines={medicinesList}
                      user={user}
                      setAuthModalOpen={setAuthModalOpen}
                      subscribedIds={subscribedIds}
                      onSubscribeNotify={handleSubscribeNotify}
                      categoryFilters={categoryFilters}
                      categoryLabelById={categoryLabelById}
                      categoryIconById={categoryIconById}
                      selectedCategory={selectedCatalogCategory}
                      onSelectCategory={setSelectedCatalogCategory}
                    />
                  </div>
                )
              )}

              {activeTab === 'calculator' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      {currentLang === 'ru' ? 'Калькулятор Курса Лечения' : currentLang === 'ar' ? 'حاسبة الجرعات والميزانية' : 'Dosage Schedule & Budgeting'}
                    </h3>
                  </div>
                  <DosageCalculator
                    currentLang={currentLang}
                    onAddToCart={handleAddToCart}
                    cart={cart}
                    allMedicines={medicinesList}
                    searchQuery={searchQuery}
                  />
                </div>
              )}

              {activeTab === 'cart' && (
                <div className="space-y-6" id="cart-drawer-view">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      {currentLang === 'ru' ? 'Ваша Корзина' : currentLang === 'ar' ? 'سلة المشتريات' : 'Your Shopping Cart'}
                    </h3>
                    <button
                      id="back-cart-link"
                      onClick={() => setActiveTab('catalog')}
                      className="text-nadeck-600 hover:text-nadeck-800 text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors"
                    >
                      {currentLang === 'ar' ? '→' : '←'} {currentLang === 'ru' ? 'Вернуться к покупкам' : currentLang === 'ar' ? 'مواصلة التسوق' : 'Continue Shopping'}
                    </button>
                  </div>
                  <CartView
                    currentLang={currentLang}
                    cart={cart}
                    onRemoveFromCart={handleRemoveFromCart}
                    onUpdateQty={handleUpdateQty}
                    user={user}
                    onPlaceOrder={handlePlaceOrder}
                    onClearCart={() => setCart([])}
                    onGoToAdditionalGoods={handleGoToAdditionalGoods}
                  />
                </div>
              )}

              {activeTab === 'orders' && (
                <OrderHistory
                  currentLang={currentLang}
                  orders={orders}
                  searchQuery={searchQuery}
                />
              )}

              {activeTab === 'admin' && (
                <AdminPanel
                  currentLang={currentLang}
                  onRefreshMedicines={() => { fetchMedicinesList(); fetchAdminMedicinesList(); }}
                  onRefreshCategories={fetchCategoriesList}
                  allMedicines={adminMedicinesList}
                  categories={adminCategories}
                  token={user.token}
                />
              )}
            </div>

          </div>

      </main>

      {/* Footer Branding line and contact details */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-950" id="main-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          {/* Newsletter signup */}
          <div className="border-b border-slate-800/60 pb-8 flex flex-col items-center text-center gap-3" id="footer-newsletter">
            <h4 className="text-white font-black text-lg sm:text-xl tracking-tight">{t('newsletterTitle')}</h4>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md">{t('newsletterSubtitle')}</p>

            {newsletterStatus === 'success' ? (
              <p id="newsletter-success" className="mt-1 text-sm font-bold text-emerald-400">{t('newsletterSuccess')}</p>
            ) : (
              <form onSubmit={handleNewsletterSubscribe} className="flex flex-col sm:flex-row gap-2 w-full max-w-md mt-1" id="newsletter-form">
                <input
                  id="newsletter-email-input"
                  type="email"
                  required
                  placeholder={t('newsletterPlaceholder')}
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-nadeck-500"
                />
                <button
                  id="newsletter-submit-btn"
                  type="submit"
                  disabled={newsletterStatus === 'loading'}
                  className="px-5 py-2.5 rounded-xl bg-nadeck-500 hover:bg-nadeck-400 text-slate-950 font-extrabold text-xs sm:text-sm tracking-wide transition disabled:opacity-60 whitespace-nowrap"
                >
                  {newsletterStatus === 'loading' ? '...' : t('newsletterSubscribeBtn')}
                </button>
              </form>
            )}
            {newsletterStatus === 'error' && (
              <p id="newsletter-error" className="text-xs font-semibold text-rose-400">{t('newsletterError')}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-nadeck-500 flex items-center justify-center p-1.5">
                  <img src={nadeckIconWhite} alt="Nadeck" className="w-full h-full object-contain" />
                </div>
                <h4 className="text-white font-bold text-sm tracking-tight">{t('appName')}</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                {t('appSubtitle')}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h5 className="text-white font-bold">{t('footerContactsTitle')}</h5>
              <p className="text-slate-500">{t('footerAddress')}</p>
              <p className="text-slate-500">📞 <a href={currentMarket.contactPhoneHref} className="hover:text-white transition-colors">{currentMarket.contactPhone}</a></p>
              <p className="text-slate-500">✉ <a href="mailto:support@nadeck.net" className="hover:text-white transition-colors">support@nadeck.net</a></p>
            </div>

            <div className="space-y-2 text-xs">
              <h5 className="text-white font-bold">{t('footerLanguagesTitle')}</h5>
              {marketLanguages.map((lang) => {
                const translatedName = LANGUAGE_NAME_TRANSLATIONS[lang.code][currentLang];
                return (
                  <p key={lang.code} className="text-slate-500">
                    {lang.flag} {translatedName}
                    {translatedName !== lang.nativeName ? ` (${lang.nativeName})` : ''}
                  </p>
                );
              })}
            </div>

            <div className="space-y-2 text-xs">
              <h5 className="text-white font-bold">{t('footerLicensingTitle')}</h5>
              <p className="text-slate-500">{t('footerLicenseText')}</p>
              <p className="text-slate-500">{t('footerCopyright')}</p>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-6 text-center text-[11px] text-slate-600 font-semibold flex flex-col sm:flex-row justify-between items-center gap-4">
            <p>{t('footerAppNote')}</p>
            <div className="flex gap-4">
              <a href="#rules" className="hover:text-slate-400 transition">{t('footerOtcGuidelines')}</a>
              <a href="#privacy" className="hover:text-slate-400 transition">{t('footerPrivacyCode')}</a>
            </div>
          </div>

        </div>
      </footer>

      {/* Global Interactive Login/Registration Modal overlay */}
      <AuthModal
        currentLang={currentLang}
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        user={user}
        onUpdateUser={setUser}
        onLogout={handleLogout}
      />

      {/* Floating AI Consultant Chatbot layer */}
      <AIPeptideAdvisor currentLang={currentLang} />

      {/* Research-use-only legal disclaimer, shown once per browser session */}
      <ResearchDisclaimerModal currentLang={currentLang} />

    </div>
  );
}
