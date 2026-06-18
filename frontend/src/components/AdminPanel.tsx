/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Medicine, Order, Language, SUPPORTED_LANGUAGES } from '../types';
import { 
  Package, 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  AlertCircle, 
  TrendingUp, 
  Truck, 
  Layers, 
  Search,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  currentLang: Language;
  onRefreshMedicines: () => void;
  allMedicines: Medicine[];
}

export default function AdminPanel({
  currentLang,
  onRefreshMedicines,
  allMedicines
}: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'orders'>('products');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search filter
  const [prodSearch, setProdSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  // CRUD state
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Medicine>>({});
  
  // Localized form inputs
  const [locNames, setLocNames] = useState<Record<Language, string>>({ ru: '', en: '', ar: '' });
  const [locSubs, setLocSubs] = useState<Record<Language, string>>({ ru: '', en: '', ar: '' });
  const [locDescs, setLocDescs] = useState<Record<Language, string>>({ ru: '', en: '', ar: '' });
  const [locFullDescs, setLocFullDescs] = useState<Record<Language, string>>({ ru: '', en: '', ar: '' });
  const [locUsages, setLocUsages] = useState<Record<Language, string>>({ ru: '', en: '', ar: '' });
  const [locInds, setLocInds] = useState<Record<Language, string>>({ ru: '', en: '', ar: '' }); // comma or newline separated
  const [locContras, setLocContras] = useState<Record<Language, string>>({ ru: '', en: '', ar: '' }); // comma or newline

  // Custom modal state for delete confirmation
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);

  // Fetch orders
  const fetchAllOrders = () => {
    setOrdersLoading(true);
    fetch('/api/admin/orders')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load orders');
        return res.json();
      })
      .then((data) => {
        setOrders(data);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('Error loading administrative orders list');
      })
      .finally(() => {
        setOrdersLoading(false);
      });
  };

  useEffect(() => {
    if (activeSubTab === 'orders') {
      fetchAllOrders();
    }
  }, [activeSubTab]);

  // Flash feedback helpers
  const showFeedback = (type: 'success' | 'error', text: string) => {
    if (type === 'success') {
      setSuccessMsg(text);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(text);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Toggle Stock Status
  const handleToggleStock = (med: Medicine) => {
    const updatedMed = {
      ...med,
      inStock: !med.inStock
    };

    fetch(`/api/medicines/${med.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedMed)
    })
      .then((res) => {
        if (!res.ok) throw new Error('Stock update failed');
        return res.json();
      })
      .then(() => {
        onRefreshMedicines();
        showFeedback('success', `Product "${med.name[currentLang] || med.name.en}" stock updated!`);
      })
      .catch((err) => {
        console.error(err);
        showFeedback('error', 'Error updating product stock status');
      });
  };

  // Delete Medicine
  const handleDeleteProduct = (medId: string, nameen: string) => {
    setProductToDelete({ id: medId, name: nameen });
  };

  const confirmDeleteProduct = () => {
    if (!productToDelete) return;
    const { id, name } = productToDelete;

    fetch(`/api/medicines/${id}`, {
      method: 'DELETE'
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete product');
        return res.json();
      })
      .then(() => {
        onRefreshMedicines();
        showFeedback('success', currentLang === 'ru' ? `Товар "${name}" успешно удален!` : `Product "${name}" deleted successfully!`);
        setProductToDelete(null);
      })
      .catch((err) => {
        console.error(err);
        showFeedback('error', currentLang === 'ru' ? 'Ошибка при удалении товара' : 'Error deleting product');
        setProductToDelete(null);
      });
  };

  // Update order status
  const handleUpdateOrderStatus = (orderId: string, status: string) => {
    fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to update status');
        return res.json();
      })
      .then(() => {
        fetchAllOrders();
        showFeedback('success', `Order ${orderId} successfully set to ${status}!`);
      })
      .catch((err) => {
        console.error(err);
        showFeedback('error', 'Could not update order status');
      });
  };

  // Open Edit Form
  const startEditProduct = (med: Medicine) => {
    setFormData(med);
    setLocNames({ ...med.name });
    setLocSubs({ ...med.activeSubstance });
    setLocDescs({ ...med.description });
    setLocFullDescs({ ...med.fullDescription });
    setLocUsages({ ...med.usage || { ru: '', en: '', ar: '' } });
    
    setLocInds({
      ru: (med.indications.ru || []).join('\n'),
      en: (med.indications.en || []).join('\n'),
      ar: (med.indications.ar || []).join('\n')
    });
    setLocContras({
      ru: (med.contraindications.ru || []).join('\n'),
      en: (med.contraindications.en || []).join('\n'),
      ar: (med.contraindications.ar || []).join('\n')
    });

    setIsEditing(true);
    setIsAdding(false);
  };

  // Open Add Form
  const startAddProduct = () => {
    setFormData({
      id: '',
      price: 15000,
      image: 'https://images.unsplash.com/photo-1579154204601-01588f351166?w=600&auto=format&fit=crop&q=80',
      rating: 5.0,
      form: 'vial',
      mgPerUnit: 5,
      dosageRules: {
        mgPerKgPerDay: 0.005,
        defaultDailyDoses: 1
      },
      inStock: true
    });
    setLocNames({ ru: '', en: '', ar: '' });
    setLocSubs({ ru: '', en: '', ar: '' });
    setLocDescs({ ru: '', en: '', ar: '' });
    setLocFullDescs({ ru: '', en: '', ar: '' });
    setLocUsages({ ru: '', en: '', ar: '' });
    setLocInds({ ru: '', en: '', ar: '' });
    setLocContras({ ru: '', en: '', ar: '' });

    setIsAdding(true);
    setIsEditing(false);
  };

  // Handle Submit (Create or Update Product)
  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();

    // ID verification handles
    const targetId = isAdding ? (formData.id || '').trim().toLowerCase() : formData.id;
    if (!targetId) {
      showFeedback('error', 'Product unique ID (slug) is required!');
      return;
    }

    if (isAdding && allMedicines.some((m) => m.id === targetId)) {
      showFeedback('error', `ID "${targetId}" already exists in catalog. Please use another unique ID.`);
      return;
    }

    const nameVal = { ...locNames };
    // Make sure we have English name as fallback
    if (!nameVal.en && nameVal.ru) nameVal.en = nameVal.ru;
    if (!nameVal.ru && nameVal.en) nameVal.ru = nameVal.en;

    const parseList = (str: string) => {
      return str.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    };

    const payload = {
      id: targetId,
      name: nameVal,
      category: formData.category || 'weightloss',
      activeSubstance: locSubs,
      description: locDescs,
      fullDescription: locFullDescs,
      indications: {
        ru: parseList(locInds.ru),
        en: parseList(locInds.en),
        ar: parseList(locInds.ar)
      },
      contraindications: {
        ru: parseList(locContras.ru),
        en: parseList(locContras.en),
        ar: parseList(locContras.ar)
      },
      usage: locUsages,
      price: Number(formData.price || 10000),
      image: formData.image || 'https://images.unsplash.com/photo-1579154204601-01588f351166?w=600&auto=format&fit=crop&q=80',
      rating: Number(formData.rating || 5.0),
      form: formData.form || 'vial',
      mgPerUnit: Number(formData.mgPerUnit || 5),
      dosageRules: formData.dosageRules || { mgPerKgPerDay: 0.005, defaultDailyDoses: 1 },
      inStock: formData.inStock !== false
    };

    const url = isAdding ? '/api/medicines' : `/api/medicines/${targetId}`;
    const method = isAdding ? 'POST' : 'PUT';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) throw new Error('Database insertion/updating error');
        return res.json();
      })
      .then(() => {
        showFeedback('success', isAdding ? 'Successfully created new product!' : 'Product parameters updated!');
        setIsAdding(false);
        setIsEditing(false);
        onRefreshMedicines();
      })
      .catch((err) => {
        console.error(err);
        showFeedback('error', 'Error saving product details to database');
      });
  };

  // Filter lists
  const filteredProds = allMedicines.filter((m) => {
    const q = prodSearch.toLowerCase();
    return (
      m.id.toLowerCase().includes(q) ||
      Object.values(m.name).some(val => val.toLowerCase().includes(q)) ||
      m.category.toLowerCase().includes(q)
    );
  });

  const filteredOrders = orders.filter((o) => {
    const q = orderSearch.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      o.userEmail.toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q) ||
      o.paymentMethod.toLowerCase().includes(q)
    );
  });

  // KPI Calculations
  const stats = {
    totalRevenue: orders.reduce((sum, o) => sum + o.totalPrice, 0),
    orderCount: orders.length,
    pendingCount: orders.filter((o) => o.status === 'pending').length,
    totalMeds: allMedicines.length
  };

  return (
    <div className="space-y-8" id="admin-panel-container">
      {/* Admin Panel Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(20,184,166,0.1),transparent)] pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 z-10 relative">
          <div>
            <span className="px-3 py-1 text-[10px] font-bold tracking-wider text-teal-400 bg-teal-500/10 border border-teal-500/25 rounded-full uppercase">
              ⚙ Admin control panel
            </span>
            <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
              {currentLang === 'ru' ? 'Панель фармацевта-администратора' : 'Pharmacist Administrator Dashboard'}
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              {currentLang === 'ru' 
                ? 'Управление товарами на складе, наличие, добавление новых препаратов и изменение статусов заказов.' 
                : 'Manage peptide listings, toggle in-stock options, post clinical indications, and fulfill active customer orders.'}
            </p>
          </div>
          
          <button
            id="admin-btn-new-product"
            onClick={startAddProduct}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-teal-500/10 active:scale-95 transition-all self-stretch sm:self-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>{currentLang === 'ru' ? 'Добавить товар' : 'Add Product'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row (shows if orders loaded) */}
      {orders.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="admin-kpis">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
              ₸
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentLang === 'ru' ? 'ВЫРУЧКА СЕРВИСА' : 'TOTAL REVENUE'}</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900">{stats.totalRevenue.toLocaleString()} ₸</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentLang === 'ru' ? 'ВСЕГО ЗАКАЗОВ' : 'TOTAL ORDERS'}</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900">{stats.orderCount}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentLang === 'ru' ? 'ОЖИДАЮТ ДОСТАВКИ' : 'PENDING ACTION'}</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900">{stats.pendingCount}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentLang === 'ru' ? 'ТЕКУЩИХ ПРЕПАРАТОВ' : 'TOTAL DRUGS'}</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900">{stats.totalMeds}</span>
            </div>
          </div>
        </div>
      )}

      {/* Flash Messages */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs sm:text-sm text-rose-700 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs sm:text-sm text-emerald-700 flex items-center gap-2"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Panel Multi-Tab layout switcher */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto scrollbar-none" id="admin-views-navbar">
        <button
          id="admin-tab-products"
          onClick={() => { setActiveSubTab('products'); setIsEditing(false); setIsAdding(false); }}
          className={`px-5 py-3 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap leading-none border-b-2 ${
            activeSubTab === 'products' && !isEditing && !isAdding
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{currentLang === 'ru' ? 'Склад товаров' : 'Peptides Catalog'}</span>
        </button>
        <button
          id="admin-tab-orders"
          onClick={() => { setActiveSubTab('orders'); setIsEditing(false); setIsAdding(false); }}
          className={`px-5 py-3 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap leading-none border-b-2 ${
            activeSubTab === 'orders' && !isEditing && !isAdding
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{currentLang === 'ru' ? 'Заказы клиентов' : 'Customer Orders'}</span>
        </button>
        {(isEditing || isAdding) && (
          <div className="px-5 py-3 text-xs sm:text-sm font-bold text-teal-600 border-b-2 border-teal-600 flex items-center gap-1">
            <Edit2 className="w-4 h-4 animate-bounce" />
            <span>{isAdding ? (currentLang === 'ru' ? 'Новый продукт' : 'Create Product') : (currentLang === 'ru' ? 'Редактирование' : 'Editing Product')}</span>
          </div>
        )}
      </div>

      {/* TAB CONTENTS rendering block */}
      <div>
        {activeSubTab === 'products' && !isEditing && !isAdding && (
          <div className="space-y-4" id="view-admin-products">
            {/* Search filter banner */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                id="admin-product-search"
                type="text"
                placeholder={currentLang === 'ru' ? 'Поиск товара по названию, категории или ID...' : 'Filter products by keyword or handle...'}
                value={prodSearch}
                onChange={(e) => setProdSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm bg-white rounded-2xl border border-slate-200/60 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all duration-200"
              />
            </div>

            {/* List Table Grid is designed with modern desktop-dense list look */}
            {filteredProds.length > 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs" id="admin-products-table-box">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" id="admin-products-table">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[9.5px] font-black">
                        <th className="py-4 px-5">{currentLang === 'ru' ? 'Товар' : 'Product'}</th>
                        <th className="py-4 px-4">{currentLang === 'ru' ? 'Раздел' : 'Category'}</th>
                        <th className="py-4 px-4">{currentLang === 'ru' ? 'Действующее вещество / Фасовка' : 'Formulation'}</th>
                        <th className="py-4 px-4">{currentLang === 'ru' ? 'Цена' : 'Price'}</th>
                        <th className="py-4 px-4 text-center">{currentLang === 'ru' ? 'Наличие' : 'Availability'}</th>
                        <th className="py-4 px-5 text-right">{currentLang === 'ru' ? 'Опции' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70 text-slate-700">
                      {filteredProds.map((med) => (
                        <tr key={med.id} className="hover:bg-slate-50/40 transition-colors" id={`admin-product-row-${med.id}`}>
                          {/* Col 1 Brand detail */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <img 
                                src={med.image} 
                                alt={med.name.en} 
                                className="w-11 h-11 rounded-lg object-cover bg-slate-50 border border-slate-100 shrink-0" 
                              />
                              <div>
                                <span className="block text-xs font-black text-slate-900 leading-tight">
                                  {med.name[currentLang] || med.name.en}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ID: {med.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Col 2 Category */}
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {med.category}
                            </span>
                          </td>

                          {/* Col 3 Info tag */}
                          <td className="py-4 px-4 text-xs">
                            <div className="space-y-0.5">
                              <p className="font-medium text-slate-800 line-clamp-1">{med.activeSubstance[currentLang] || med.activeSubstance.en}</p>
                              <p className="text-[10px] text-slate-400 font-bold capitalize">
                                {med.form} • {med.mgPerUnit} mg
                              </p>
                            </div>
                          </td>

                          {/* Col 4 Price point */}
                          <td className="py-4 px-4">
                            <span className="text-xs font-black text-slate-900">
                              {med.price.toLocaleString()} ₸
                            </span>
                          </td>

                          {/* Col 5 Stock switcher ("что продана что нет") */}
                          <td className="py-4 px-4 text-center">
                            <button
                              id={`toggle-stock-btn-${med.id}`}
                              onClick={() => handleToggleStock(med)}
                              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold cursor-pointer transition-all ${
                                med.inStock
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${med.inStock ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span>{med.inStock ? (currentLang === 'ru' ? 'В наличии' : 'In Stock') : (currentLang === 'ru' ? 'Распродано' : 'Sold Out')}</span>
                            </button>
                          </td>

                          {/* Col 6 Buttons */}
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                id={`edit-prod-${med.id}`}
                                onClick={() => startEditProduct(med)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-slate-600 transition-colors"
                                title="Edit Product parameters"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`delete-prod-${med.id}`}
                                onClick={() => handleDeleteProduct(med.id, med.name[currentLang] || med.name.en)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors"
                                title="Delete from catalog"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200" id="admin-empty-catalog">
                <AlertTriangle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No matching products found</h3>
                <p className="text-xs text-slate-400 mt-1">Try to refine your keyword search criteria.</p>
              </div>
            )}
          </div>
        )}

        {/* ORDER DISPATCH TAB */}
        {activeSubTab === 'orders' && !isEditing && !isAdding && (
          <div className="space-y-4" id="view-admin-orders">
            {/* Search filter for orders */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                id="admin-order-search"
                type="text"
                placeholder={currentLang === 'ru' ? 'Поиск заказа по Email покупателя, ID, статусу доставки...' : 'Filter orders by email, ID, or payment format...'}
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm bg-white rounded-2xl border border-slate-200/60 focus:border-teal-500 focus:outline-none transition-all duration-200"
              />
            </div>

            {/* List of customer orders */}
            {ordersLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs font-semibold" id="orders-loading-state">
                <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin mx-auto mb-3" />
                {currentLang === 'ru' ? 'Загрузка заказов...' : 'Reading service orders...'}
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="space-y-4" id="admin-orders-container">
                {filteredOrders.map((order) => {
                  const statusColors: any = {
                    pending: 'bg-amber-50 text-amber-800 border-amber-200/60',
                    processing: 'bg-indigo-50 text-indigo-800 border-indigo-200/60',
                    shipped: 'bg-cyan-50 text-cyan-800 border-cyan-200/60',
                    delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                  };

                  return (
                    <div 
                      key={order.id} 
                      className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between hover:border-slate-200 transition-colors"
                      id={`admin-order-card-${order.id}`}
                    >
                      <div className="space-y-3 flex-1">
                        {/* Header order tags */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black text-slate-900 font-mono px-3 py-1 bg-slate-100 rounded-xl">
                            {order.id}
                          </span>
                          <span className="text-xs text-slate-400 font-medium font-mono">
                            {order.date}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-100/50">
                            {order.userEmail}
                          </span>
                        </div>

                        {/* Items list */}
                        <div className="space-y-1.5" id={`admin-items-list-${order.id}`}>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentLang === 'ru' ? 'Состав посылки' : 'Order Contents'}</p>
                          <div className="flex flex-wrap gap-1">
                            {order.items.map((item, idx) => (
                              <span 
                                key={idx} 
                                className="inline-block text-[11px] font-semibold text-slate-800 px-2.5 py-1 bg-slate-50 rounded-xl border border-slate-100"
                              >
                                {item.medicineName[currentLang] || item.medicineName.en || 'Peptide Item'} 
                                <span className="text-teal-600 font-black ml-1">x{item.quantity}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Address */}
                        <div className="text-xs text-slate-500 space-y-0.5">
                          <p className="font-medium text-slate-800">
                            📍 {currentLang === 'ru' ? 'Адрес доставки' : 'Delivery Destination'}:
                          </p>
                          <p className="leading-relaxed">
                            {order.address.city}, {order.address.street}, кв./офис {order.address.apartment} {order.address.postalCode && `• Инд. ${order.address.postalCode}`}
                          </p>
                        </div>
                      </div>

                      {/* Right Hand: Pricing and Status Modifier controls */}
                      <div className="w-full lg:w-auto flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        {/* Order total */}
                        <div className="text-right">
                          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentLang === 'ru' ? 'ИТОГО К ОПЛАТЕ' : 'ORDER GRAND TOTAL'}</span>
                          <span className="text-base sm:text-lg font-black text-slate-900">{order.totalPrice.toLocaleString()} ₸</span>
                          <span className="block text-[9px] text-teal-600 font-bold uppercase mt-0.5">{order.paymentMethod}</span>
                        </div>

                        {/* Status updating Selector dropdown */}
                        <div className="space-y-1 cursor-pointer">
                          <label className="block text-[9.5px] text-slate-400 font-bold text-right leading-none uppercase">{currentLang === 'ru' ? 'СТАТУС ДОСТАВКИ' : 'ORDER PROGRESS STATUS'}</label>
                          <select
                            id={`status-select-${order.id}`}
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-700 focus:outline-none cursor-pointer"
                          >
                            <option value="pending">⏳ Pending (Ожидание)</option>
                            <option value="processing">⚙ Processing (Сборка)</option>
                            <option value="shipped">🚀 Shipped (В пути)</option>
                            <option value="delivered">✅ Delivered (Вручено)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200" id="admin-empty-orders">
                <AlertTriangle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No database orders recorded</h3>
                <p className="text-xs text-slate-400 mt-1">Orders placed by checkout clients will display here instantly.</p>
              </div>
            )}
          </div>
        )}

        {/* ADD OR EDIT PRODUCT FORM VIEW COMPONENT */}
        {(isEditing || isAdding) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs"
            id="admin-form-shell"
          >
            <form onSubmit={handleSubmitProduct} className="space-y-6" id="admin-product-item-form">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h3 id="form-heading" className="text-base sm:text-lg font-black text-slate-900">
                    {isAdding 
                      ? (currentLang === 'ru' ? '➕ Создание новой карточки товара' : 'Create New Medicine Card') 
                      : (currentLang === 'ru' ? '📝 Корректировка параметров препарата' : 'Modify Peptide Inventory Setup')}
                  </h3>
                  <p className="text-xs text-slate-400">{currentLang === 'ru' ? 'Заполните поля ниже. Поддерживаются 3 языка.' : 'Provide localized tags, indicators, and calculation rates.'}</p>
                </div>
                <button
                  id="form-close-btn"
                  type="button"
                  onClick={() => { setIsAdding(false); setIsEditing(false); }}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid 1 Block: Basic numeric identifiers and pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    {currentLang === 'ru' ? 'Уникальный ID (slug)' : 'Unique String ID (Slug)'} *
                  </label>
                  <input
                    id="form-input-id"
                    type="text"
                    required
                    disabled={!isAdding}
                    placeholder="e.g. semaglutide"
                    value={formData.id || ''}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 font-mono"
                  />
                  {isAdding && <span className="text-[10px] text-slate-400 mt-1 block">Only letters and hyphens, no spaces.</span>}
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    {currentLang === 'ru' ? 'Категория' : 'Category'} *
                  </label>
                  <select
                    id="form-select-category"
                    value={formData.category || 'weightloss'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none"
                  >
                    <option value="weightloss">Weight Loss (Похудение)</option>
                    <option value="painkiller">Healing & Repair (Заживление)</option>
                    <option value="vitamin">Vitamins & Hormones (Витамины/Гормоны)</option>
                    <option value="antiallergic">Anti-Allergic (Противоаллергены)</option>
                    <option value="digestive">Digestive (Пищеварение)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    {currentLang === 'ru' ? 'Стоимость в тенге (₸)' : 'Price (₸)'} *
                  </label>
                  <input
                    id="form-input-price"
                    type="number"
                    required
                    min="0"
                    placeholder="18500"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none text-slate-900 font-extrabold"
                  />
                </div>
              </div>

              {/* Grid 2 Block: Images, Form, and Ratings */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5 animate-pulse">
                    {currentLang === 'ru' ? 'Ссылка на Изображение' : 'Unsplash / Image URL'}
                  </label>
                  <input
                    id="form-input-image"
                    type="text"
                    placeholder="https://..."
                    value={formData.image || ''}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    {currentLang === 'ru' ? 'Форма выпуска' : 'Packaging Form'}
                  </label>
                  <select
                    id="form-select-form"
                    value={formData.form || 'vial'}
                    onChange={(e) => setFormData({ ...formData, form: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none"
                  >
                    <option value="vial">Vial (Ампула/Флакон)</option>
                    <option value="tablet">Tablet (Таблированный)</option>
                    <option value="capsule">Capsule (Капсула)</option>
                    <option value="liquid">Liquid (Жидкий раствор)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    {currentLang === 'ru' ? 'Рейтинг товара (0-5)' : 'Initial Rating (0-5)'}
                  </label>
                  <input
                    id="form-input-rating"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={formData.rating || 5.0}
                    onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Grid 3 Block: Medicine Dose Parameters for precise calculation engine support */}
              <div className="bg-teal-500/5 p-4 rounded-2xl border border-teal-500/10 space-y-4" id="form-dosage-rules-box">
                <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider">
                  🧪 Настройки расчёта дозировок (Dosage Calculation Parameters)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {currentLang === 'ru' ? 'Активного вещества во флаконе (мг)' : 'Vial strength (mg)'}
                    </label>
                    <input
                      id="form-input-mgperunit"
                      type="number"
                      placeholder="5"
                      value={formData.mgPerUnit || ''}
                      onChange={(e) => setFormData({ ...formData, mgPerUnit: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {currentLang === 'ru' ? 'Мг на 1 кг веса в сутки' : 'Clinical Factor (mg/kg/day)'}
                    </label>
                    <input
                      id="form-input-rules-factor"
                      type="number"
                      step="0.0001"
                      placeholder="0.005"
                      value={formData.dosageRules?.mgPerKgPerDay || 0.005}
                      onChange={(e) => setFormData({
                        ...formData,
                        dosageRules: {
                          mgPerKgPerDay: Number(e.target.value),
                          defaultDailyDoses: formData.dosageRules?.defaultDailyDoses || 1
                        }
                      })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {currentLang === 'ru' ? 'Раз в день (базово)' : 'Default administrations / day'}
                    </label>
                    <input
                      id="form-input-rules-doses"
                      type="number"
                      placeholder="1"
                      value={formData.dosageRules?.defaultDailyDoses || 1}
                      onChange={(e) => setFormData({
                        ...formData,
                        dosageRules: {
                          mgPerKgPerDay: formData.dosageRules?.mgPerKgPerDay || 0.005,
                          defaultDailyDoses: Number(e.target.value)
                        }
                      })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Grid 4 Block: Russian (RU) Localized fields */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 space-y-4" id="form-ru-fields">
                <span className="text-xs uppercase font-black text-slate-800 tracking-wider flex items-center gap-1">
                  🇷🇺 Русский язык (Russian translation config)
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Название препарата (RU)</label>
                    <input
                      id="form-ru-name"
                      type="text"
                      placeholder="Напр. Семаглутид 5мг"
                      value={locNames.ru}
                      onChange={(e) => setLocNames({ ...locNames, ru: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Действующее вещество (RU)</label>
                    <input
                      id="form-ru-substance"
                      type="text"
                      placeholder="Напр. Semaglutide (Семаглутид)"
                      value={locSubs.ru}
                      onChange={(e) => setLocSubs({ ...locSubs, ru: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Краткое описание (RU)</label>
                    <textarea
                      id="form-ru-desc"
                      rows={2}
                      placeholder="Революционный пептид для снижения аппетита..."
                      value={locDescs.ru}
                      onChange={(e) => setLocDescs({ ...locDescs, ru: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 resize-none animate-height"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Инструкция применения (RU)</label>
                    <textarea
                      id="form-ru-usage"
                      rows={2}
                      placeholder="Вводить подкожно 1 раз в неделю..."
                      value={locUsages.ru}
                      onChange={(e) => setLocUsages({ ...locUsages, ru: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Полная аннотация клиническая (RU)</label>
                    <textarea
                      id="form-ru-full-desc"
                      rows={2}
                      placeholder="Семаглутид — это селективный агонист рецепторов ГПП-1..."
                      value={locFullDescs.ru}
                      onChange={(e) => setLocFullDescs({ ...locFullDescs, ru: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Показания к применению (RU, разделяйте новые строки)</label>
                    <textarea
                      id="form-ru-inds"
                      rows={2}
                      placeholder="Избыточная масса тела&#10;Инсулинорезистентность"
                      value={locInds.ru}
                      onChange={(e) => setLocInds({ ...locInds, ru: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Противопоказания (RU, разделяйте новые строки)</label>
                    <textarea
                      id="form-ru-contras"
                      rows={2}
                      placeholder="Период беременности&#10;Медуллярный рак"
                      value={locContras.ru}
                      onChange={(e) => setLocContras({ ...locContras, ru: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Grid 5 Block: English (EN) Localized fields */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 space-y-4" id="form-en-fields">
                <span className="text-xs uppercase font-black text-slate-800 tracking-wider flex items-center gap-1">
                  🇺🇸 English (English translation layout)
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Brand/Name (EN) *</label>
                    <input
                      id="form-en-name"
                      type="text"
                      required
                      placeholder="e.g. Semaglutide 5mg"
                      value={locNames.en}
                      onChange={(e) => setLocNames({ ...locNames, en: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Active Substance (EN)</label>
                    <input
                      id="form-en-substance"
                      type="text"
                      placeholder="e.g. Semaglutide"
                      value={locSubs.en}
                      onChange={(e) => setLocSubs({ ...locSubs, en: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Brief Description (EN)</label>
                    <textarea
                      id="form-en-desc"
                      rows={2}
                      placeholder="Revolutionary peptide for weight management..."
                      value={locDescs.en}
                      onChange={(e) => setLocDescs({ ...locDescs, en: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Usage / Method (EN)</label>
                    <textarea
                      id="form-en-usage"
                      rows={2}
                      placeholder="Subcutaneous injection once weekly..."
                      value={locUsages.en}
                      onChange={(e) => setLocUsages({ ...locUsages, en: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Full Description (EN)</label>
                    <textarea
                      id="form-en-full-desc"
                      rows={2}
                      placeholder="Semaglutide is a selective GLP-1 receptor agonist..."
                      value={locFullDescs.en}
                      onChange={(e) => setLocFullDescs({ ...locFullDescs, en: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Indications (EN, split by newlines)</label>
                    <textarea
                      id="form-en-inds"
                      rows={2}
                      placeholder="Excess body weight&#10;Insulin resistance"
                      value={locInds.en}
                      onChange={(e) => setLocInds({ ...locInds, en: e.target.value })}
                      className="w-full px-3 py-1.5 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Contraindications (EN, split by newlines)</label>
                    <textarea
                      id="form-en-contras"
                      rows={2}
                      placeholder="Hypersensitivity to Semaglutide&#10;Pregnancy"
                      value={locContras.en}
                      onChange={(e) => setLocContras({ ...locContras, en: e.target.value })}
                      className="w-full px-3 py-1.5 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Grid 6 Block: Arabic (AR) Localized fields */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 space-y-4" id="form-ar-fields" dir="rtl">
                <span className="text-xs uppercase font-black text-slate-800 tracking-wider flex items-center justify-start gap-1">
                  🇸🇦 اللغة العربية (Arabic Translation Configuration)
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">الاسم التجاري (AR)</label>
                    <input
                      id="form-ar-name"
                      type="text"
                      placeholder="مثال: سيماجلوتايد 5 ملغ"
                      value={locNames.ar}
                      onChange={(e) => setLocNames({ ...locNames, ar: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">المادة الفعالة (AR)</label>
                    <input
                      id="form-ar-substance"
                      type="text"
                      placeholder="مثال: سيماجلوتايد"
                      value={locSubs.ar}
                      onChange={(e) => setLocSubs({ ...locSubs, ar: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">وصف موجز (AR)</label>
                    <textarea
                      id="form-ar-desc"
                      rows={2}
                      placeholder="ببتيد ثوري لكبح الشهية..."
                      value={locDescs.ar}
                      onChange={(e) => setLocDescs({ ...locDescs, ar: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs text-right border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">طريقة الاستخدام (AR)</label>
                    <textarea
                      id="form-ar-usage"
                      rows={2}
                      placeholder="حقن تحت الجلد مرة واحدة في الأسبوع..."
                      value={locUsages.ar}
                      onChange={(e) => setLocUsages({ ...locUsages, ar: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs text-right border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">الوصف الكامل الطبي (AR)</label>
                    <textarea
                      id="form-ar-full-desc"
                      rows={2}
                      placeholder="سيماجلوتايد هو منبه لنبضات الغدد..."
                      value={locFullDescs.ar}
                      onChange={(e) => setLocFullDescs({ ...locFullDescs, ar: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs text-right border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Form buttons block */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3" id="form-actions-row">
                <button
                  id="form-cancel-actions"
                  type="button"
                  onClick={() => { setIsAdding(false); setIsEditing(false); }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 font-bold text-xs rounded-xl transition-colors"
                >
                  {currentLang === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  id="form-submit-actions"
                  type="submit"
                  className="px-6 py-2.5 bg-slice-950 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                >
                  {currentLang === 'ru' ? 'Сохранить изменения' : 'Save Changes'}
                </button>
              </div>

            </form>
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation Modal Overlay */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" id="delete-confirmation-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {currentLang === 'ru' ? 'Подтверждение удаления' : 'Confirm Deletion'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {currentLang === 'ru'
                      ? `Вы действительно хотите безвозвратно удалить товар "${productToDelete.name}" из каталога?`
                      : `Are you sure you want to permanently delete the product "${productToDelete.name}" from the catalog?`}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-colors"
                >
                  {currentLang === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteProduct}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors"
                >
                  {currentLang === 'ru' ? 'Удалить' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
