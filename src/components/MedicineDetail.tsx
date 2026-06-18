/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Medicine, Language, CartItem } from '../types';
import { TRANSLATIONS } from '../data';
import { Star, ArrowLeft, Plus, Minus, ShoppingCart, ShieldAlert, Award, FileText, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface MedicineDetailProps {
  currentLang: Language;
  medicine: Medicine;
  onBack: () => void;
  cart: CartItem[];
  onAddToCart: (medicine: Medicine, quantity: number) => void;
}

export default function MedicineDetail({
  currentLang,
  medicine,
  onBack,
  cart,
  onAddToCart
}: MedicineDetailProps) {
  const [qty, setQty] = useState<number>(1);

  const t = (key: string) => {
    return TRANSLATIONS[key]?.[currentLang] || key;
  };

  const increment = () => setQty(prev => prev + 1);
  const decrement = () => setQty(prev => prev > 1 ? prev - 1 : 1);

  const cartQty = cart.find(item => item.medicine.id === medicine.id)?.quantity || 0;
  const isAdded = cartQty > 0;

  const handleAddToCart = () => {
    onAddToCart(medicine, qty);
    setQty(1); // Reset local quantity
  };

  return (
    <div className="space-y-6" id="medicine-detail-view">
      
      {/* Back to list trigger */}
      <button
        id="btn-back-to-catalog"
        onClick={onBack}
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs sm:text-sm font-semibold transition"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('backToCatalog')}
      </button>

      {/* Main product showcase panel */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 p-6 sm:p-8">
        
        {/* Pictures gallery column */}
        <div className="md:col-span-5 flex flex-col gap-4" id="detail-image-col">
          <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 relative">
            <img
              src={medicine.image}
              alt={medicine.name[currentLang]}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center gap-2 justify-center py-2 px-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 text-xs text-center font-medium">
            <Award className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Сертифицированный оригинальный препарат</span>
          </div>
        </div>

        {/* Essential Info column */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-6" id="detail-info-col">
          
          {/* Header titles */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 rounded-full">
                {t(`cat${medicine.category.charAt(0).toUpperCase() + medicine.category.slice(1)}`)}
              </span>
              <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                <Star className="w-4 h-4 fill-current animate-spin-pulse" />
                <span>{medicine.rating} / 5.0</span>
              </div>
            </div>

            <h2 id={`detail-product-title-${medicine.id}`} className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {medicine.name[currentLang]}
            </h2>

            <div className="flex flex-col gap-1 text-xs text-slate-500 font-medium">
              <p>
                <span className="text-slate-400 font-semibold">{t('activeSubstanceLabel')}:</span>{' '}
                <span className="text-teal-700 font-bold">{medicine.activeSubstance[currentLang]}</span>
              </p>
              <p>
                <span className="text-slate-400 font-semibold">
                  {currentLang === 'ru' ? 'Форма выпуска' : currentLang === 'ar' ? 'شكل الدواء' : 'Dosage Form'}:
                </span>{' '}
                <span className="text-slate-700 font-bold">
                  {medicine.form === 'tablet' 
                    ? (currentLang === 'ru' ? 'Таблетки' : currentLang === 'ar' ? 'أقراص' : 'Tablets') 
                    : medicine.form === 'capsule' 
                    ? (currentLang === 'ru' ? 'Капсулы' : currentLang === 'ar' ? 'كبسولات' : 'Capsules') 
                    : (currentLang === 'ru' ? 'Раствор' : currentLang === 'ar' ? 'محلول' : 'Liquid suspension')
                  } ({medicine.mgPerUnit} мг)
                </span>
              </p>
            </div>
          </div>

          {/* Description summary */}
          <div className="space-y-2 bg-slate-50/55 p-4 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t('aboutDrug')}</h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              {medicine.fullDescription[currentLang]}
            </p>
          </div>

          {/* Interactive Buy Drawer */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Price section */}
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase">{t('priceLabel')}</span>
              <div id="detail-product-price" className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {medicine.price.toLocaleString()} {t('currencySymbol')}
              </div>
            </div>

            {/* Qty and Add buttons */}
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-slate-200 rounded-xl p-1 bg-slate-50/50">
                <button
                  id="btn-decrement-qty"
                  onClick={decrement}
                  className="p-2 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 active:scale-90 transition"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span id="detail-qty-indicator" className="w-8 text-center text-sm font-bold text-slate-800 select-none">
                  {qty}
                </span>
                <button
                  id="btn-increment-qty"
                  onClick={increment}
                  className="p-2 rounded-lg hover:bg-white text-slate-500 hover:text-slate-800 active:scale-90 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                id="btn-detail-add-to-cart"
                onClick={handleAddToCart}
                className="flex-1 sm:flex-none px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-teal-100 active:scale-95 transition"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{t('addToCart')} ({qty})</span>
              </button>
            </div>

          </div>

          {/* If already in cart, show indicator */}
          {isAdded && (
            <div id="detail-incart-feedback" className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl p-3 text-xs flex items-center gap-2 font-bold animate-pulse">
              <Check className="w-4 h-4" />
              <span>
                {currentLang === 'ru' 
                  ? `Уже добавлен в вашу корзину (количество: ${cartQty})` 
                  : `Already in your cart (quantity: ${cartQty})`
                }
              </span>
            </div>
          )}

        </div>
      </div>

      {/* Complete Usage Reference Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Indications */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 space-y-4" id="indications-panel">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50 text-teal-800">
            <FileText className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold">{t('indicationsTitle')}</h3>
          </div>
          <ul className="space-y-2.5">
            {medicine.indications[currentLang]?.map((ind, idx) => (
              <li key={idx} className="flex gap-2.5 text-xs sm:text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 shrink-0" />
                <span>{ind}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Contraindications & Mode */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 space-y-6" id="contraindications-panel">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-50 text-rose-800">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <h3 className="text-base font-bold">{t('contraindicationsTitle')}</h3>
            </div>
            <ul className="space-y-2.5">
              {medicine.contraindications[currentLang]?.map((con, idx) => (
                <li key={idx} className="flex gap-2.5 text-xs sm:text-sm text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-50">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">{t('usageMethod')}</h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
              {medicine.usage[currentLang]}
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
