/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Language, Medicine, CartItem, User, Order, SUPPORTED_LANGUAGES } from './types';
import { TRANSLATIONS } from './data';
import Navbar from './components/Navbar';
import MedicineGrid from './components/MedicineGrid';
import MedicineDetail from './components/MedicineDetail';
import DosageCalculator from './components/DosageCalculator';
import CartView from './components/CartView';
import OrderHistory from './components/OrderHistory';
import AuthModal from './components/AuthModal';
import AIPeptideAdvisor from './components/AIPeptideAdvisor';
import AdminPanel from './components/AdminPanel';
import { ShoppingCart, Calculator, MapPin, Heart, Clock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Lang state (initializes from localStorage if available, fallback to Russian 'ru')
  const [currentLang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('pharmacy_lang');
    return (saved as Language) || 'ru';
  });

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'catalog' | 'calculator' | 'cart' | 'orders' | 'admin'>('catalog');
  
  // Selected single medicine for details
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  // Load medicines list from database, default to empty to allow loading inside Grid
  const [medicinesList, setMedicinesList] = useState<Medicine[]>([]);

  const fetchMedicinesList = () => {
    fetch('/api/medicines')
      .then((res) => {
        if (!res.ok) throw new Error('Database loading failed');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMedicinesList(data);
        }
      })
      .catch((err) => {
        console.error('Error loading medicines from db, using fallback list:', err);
      });
  };

  useEffect(() => {
    fetchMedicinesList();
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

  // Dialog modals toggling state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const cartOpen = activeTab === 'cart';
  const setCartOpen = (open: boolean) => {
    setActiveTab(open ? 'cart' : 'catalog');
  };

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('pharmacy_lang', currentLang);
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

  const t = (key: string) => {
    return TRANSLATIONS[key]?.[currentLang] || key;
  };

  // Cart operations
  const handleAddToCart = (medicine: Medicine, qtyToAdd: number = 1) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.medicine.id === medicine.id);
      if (existing) {
        return prevCart.map((item) =>
          item.medicine.id === medicine.id
            ? { ...item, quantity: item.quantity + qtyToAdd }
            : item
        );
      }
      return [...prevCart, { medicine, quantity: qtyToAdd }];
    });
  };

  const handleRemoveFromCart = (medId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.medicine.id !== medId));
  };

  const handleUpdateQty = (medId: string, updatedQty: number) => {
    if (updatedQty <= 0) {
      handleRemoveFromCart(medId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.medicine.id === medId ? { ...item, quantity: updatedQty } : item
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

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans selection:bg-teal-500 selection:text-white" id="main-frame">
      
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
      />

      {/* Primary Dynamic Content Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10" id="main-content-flow">
          
          <div className="space-y-8" id="tab-views-container">
            
            {/* Visual Hero Banner: show only on landing Catalog with NO query filters */}
            {activeTab === 'catalog' && !selectedMedicine && !searchQuery && (
              <div 
                className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-teal-700 to-slate-900 text-white p-6 sm:p-10 lg:p-12 shadow-xl border border-teal-800 flex flex-col md:flex-row items-center justify-between gap-6" 
                id="hero-banner"
              >
                {/* Visual back glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(20,184,166,0.15),transparent)] pointer-events-none" />
                
                <div className="space-y-4 max-w-xl z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded-full">
                    ✔ 3-язычный сервис: RU • EN • AR
                  </span>
                  <h2 id="hero-title" className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                    {currentLang === 'ru' 
                      ? 'Сертифицированные лекарства и точный расчет' 
                      : currentLang === 'ar'
                      ? 'أدوية معتمدة وحاسبة جرعات دقيقة'
                      : 'Certified Medicines & Precision Dosage Calculator'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                    {currentLang === 'ru'
                      ? 'Выбирайте необходимые препараты, рассчитывайте безопасную дозировку по весу на нашем калькуляторе и оформляйте быструю доставку до двери.'
                      : currentLang === 'ar'
                      ? 'اكتشف الأدوية المعتمدة، واحسب الجرعة الآمنة بناءً على الوزن باستخدام الحاسبة، واطلب التوصيل السريع إلى باب منزلك.'
                      : 'Explore certified medical items, safely calculate individual weight-based schedules, and place home delivery in minutes.'}
                  </p>
                  
                  <div className="pt-2 flex flex-wrap gap-2.5 sm:gap-4">
                    <button
                      id="hero-btn-calc"
                      onClick={handleHeroGoToCalculator}
                      className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-teal-500/10 active:scale-95 transition-all"
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
                        className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs rounded-xl transition-all"
                      >
                        {t('loginBtn')} / {t('registerBtn')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Conceptual vector image showcase */}
                <div className="relative shrink-0 hidden md:block w-48 lg:w-56" id="hero-graphics">
                  <div className="w-full aspect-square bg-white/5 rounded-full border border-teal-500/20 flex items-center justify-center p-6 animate-spin-slow">
                    <div className="w-full h-full rounded-full bg-teal-400/10 flex items-center justify-center">
                      <div className="w-14 h-14 bg-teal-500 text-slate-950 text-3xl font-bold flex items-center justify-center rounded-3xl shadow-lg">
                        ✚
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
                  />
                ) : (
                  /* Cards Catalog screen */
                  <div className="space-y-6">
                    <div className="flex justify-between items-baseline pb-2 border-b border-slate-100">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">
                        {currentLang === 'ru' ? 'Каталог медицинских товаров' : currentLang === 'ar' ? 'دليل المنتجات الطبية' : 'Pharmacy Drug Catalog'}
                      </h3>
                      <span className="text-xs text-slate-400 font-semibold uppercase">{currentLang === 'ru' ? 'Только оригинал' : 'Certified supply'}</span>
                    </div>
                    <MedicineGrid
                      currentLang={currentLang}
                      onSelectMedicine={setSelectedMedicine}
                      cart={cart}
                      onAddToCart={handleAddToCart}
                      searchQuery={searchQuery}
                      allMedicines={medicinesList}
                    />
                  </div>
                )
              )}

              {activeTab === 'calculator' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      {currentLang === 'ru' ? 'Калькулятор Курса Лечения' : 'Dosage Schedule & Budgeting'}
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
                      className="text-teal-600 hover:text-teal-800 text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors"
                    >
                      ← {currentLang === 'ru' ? 'Вернуться к покупкам' : 'Continue Shopping'}
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
                  onRefreshMedicines={fetchMedicinesList}
                  allMedicines={medicinesList}
                />
              )}
            </div>

          </div>

      </main>

      {/* Footer Branding line and contact details */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-950" id="main-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-black text-sm">
                  ✚
                </div>
                <h4 className="text-white font-bold text-sm tracking-tight">{t('appName')}</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                {t('appSubtitle')}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h5 className="text-white font-bold">{currentLang === 'ru' ? 'Контакты' : 'Contacts'}</h5>
              <p className="text-slate-500">📍 Алматы, пр. Назарбаева 130</p>
              <p className="text-slate-500">📞 +7 (727) 321-45-67</p>
              <p className="text-slate-500">✉ support@healthypharm.kz</p>
            </div>

            <div className="space-y-2 text-xs">
              <h5 className="text-white font-bold">{currentLang === 'ru' ? 'Языки сервиса' : 'Supported Languages'}</h5>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <p key={lang.code} className="text-slate-500">
                  {lang.flag} {lang.nativeName} ({lang.name})
                </p>
              ))}
            </div>

            <div className="space-y-2 text-xs">
              <h5 className="text-white font-bold">{currentLang === 'ru' ? 'Безопасность' : 'Licensing'}</h5>
              <p className="text-slate-500">Лицензия №1044392 ФК Республики Казахстан.</p>
              <p className="text-slate-500">Все права защищены © 2026.</p>
            </div>
          </div>

          <div className="border-t border-slate-800/60 pt-6 text-center text-[11px] text-slate-600 font-semibold flex flex-col sm:flex-row justify-between items-center gap-4">
            <p>Healthy Pharmacy App • Designed & Simulated on Google Cloud platform</p>
            <div className="flex gap-4">
              <a href="#rules" className="hover:text-slate-400 transition">{currentLang === 'ru' ? 'Правила отпуска' : 'OTC Guidelines'}</a>
              <a href="#privacy" className="hover:text-slate-400 transition">{currentLang === 'ru' ? 'Конфиденциальность' : 'Privacy Code'}</a>
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

    </div>
  );
}
