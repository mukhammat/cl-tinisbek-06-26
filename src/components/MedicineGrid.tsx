/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { useState } from 'react';
import { Medicine, Language, CartItem } from '../types';
import { MEDICINES_DATA, TRANSLATIONS } from '../data';
import { Star, Check, Plus, ShoppingCart, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface MedicineGridProps {
  currentLang: Language;
  onSelectMedicine: (medicine: Medicine) => void;
  cart: CartItem[];
  onAddToCart: (medicine: Medicine, quantity?: number) => void;
  searchQuery: string;
}

export default function MedicineGrid({
  currentLang,
  onSelectMedicine,
  cart,
  onAddToCart,
  searchQuery
}: MedicineGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const t = (key: string) => {
    return TRANSLATIONS[key]?.[currentLang] || key;
  };

  const categories = [
    { id: 'all', label: t('categoriesAll') },
    { id: 'painkiller', label: t('catPainkiller') },
    { id: 'vitamin', label: t('catVitamin') },
    { id: 'antiallergic', label: t('catAntiallergic') },
    { id: 'digestive', label: t('catDigestive') }
  ];

  // Filter medicines based on category AND search input
  const filteredMedicines = MEDICINES_DATA.filter((med) => {
    const matchesCategory = selectedCategory === 'all' || med.category === selectedCategory;
    
    const query = searchQuery.toLowerCase();
    const nameMatch = med.name[currentLang]?.toLowerCase().includes(query) || med.name['en']?.toLowerCase().includes(query);
    const descMatch = med.description[currentLang]?.toLowerCase().includes(query);
    const substanceMatch = med.activeSubstance[currentLang]?.toLowerCase().includes(query);
    
    return matchesCategory && (nameMatch || descMatch || substanceMatch);
  });

  const isItemInCart = (medId: string) => {
    return cart.some((item) => item.medicine.id === medId);
  };

  return (
    <div className="space-y-8" id="catalog-section">
      
      {/* Categories Horizontal Scrolling Filter */}
      <div 
        className="flex gap-2 pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0" 
        id="category-filters-container"
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            id={`filter-btn-${cat.id}`}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap snap-start transition-all duration-200 ${
              selectedCategory === cat.id
                ? 'bg-teal-600 border border-teal-600 text-white shadow-md shadow-teal-50'
                : 'bg-white border border-slate-200/50 text-slate-600 hover:border-slate-300 hover:text-slate-900 shadow-sm'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid container */}
      {filteredMedicines.length > 0 ? (
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8" 
          id="medicines-grid-layout"
        >
          {filteredMedicines.map((med, index) => {
            const inCart = isItemInCart(med.id);
            const cartQty = cart.find(item => item.medicine.id === med.id)?.quantity || 0;

            return (
              <motion.div
                key={med.id}
                id={`medicine-card-${med.id}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group flex flex-col bg-white rounded-3xl border border-slate-100/80 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-350 overflow-hidden"
              >
                
                {/* Visual Thumbnail */}
                <div 
                  className="aspect-video w-full relative bg-slate-50 cursor-pointer overflow-hidden p-0"
                  onClick={() => onSelectMedicine(med)}
                  id={`thumbnail-${med.id}`}
                >
                  <img
                    src={med.image}
                    alt={med.name[currentLang]}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Category Badge overlay */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] uppercase font-bold text-teal-800 bg-teal-50/90 rounded-full border border-teal-100/50">
                    {t(`cat${med.category.charAt(0).toUpperCase() + med.category.slice(1)}`)}
                  </span>
                  {/* Score */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-xs py-0.5 px-2 rounded-full border border-slate-100 text-amber-500 text-xs font-extrabold select-none">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="text-slate-800 text-[10.5px]">{med.rating}</span>
                  </div>
                </div>

                {/* Body details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    {/* Active Substance tagline */}
                    <span className="text-[10px] text-teal-600 font-bold tracking-wider uppercase">
                      {med.activeSubstance[currentLang]}
                    </span>
                    
                    {/* Medicine Name */}
                    <h3 
                      className="text-base font-extrabold text-slate-950 group-hover:text-teal-600 cursor-pointer transition-colors leading-snug line-clamp-1"
                      onClick={() => onSelectMedicine(med)}
                      id={`title-${med.id}`}
                    >
                      {med.name[currentLang]}
                    </h3>
                    
                    {/* Brief desc */}
                    <p className="text-xs text-slate-500 leading-relaxed font-normal min-h-[36px] line-clamp-2">
                      {med.description[currentLang]}
                    </p>
                  </div>

                  {/* Actions & Price Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-100/70 flex items-center justify-between gap-3">
                    {/* Price Tag */}
                    <div>
                      <span className="block text-[10px] text-slate-400 font-medium">{t('priceLabel')}</span>
                      <span id={`price-${med.id}`} className="text-base font-extrabold text-slate-900">
                        {med.price.toLocaleString()} {t('currencySymbol')}
                      </span>
                    </div>

                    {/* Cart operations */}
                    <button
                      id={`add-to-cart-btn-${med.id}`}
                      onClick={() => onAddToCart(med, 1)}
                      className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all duration-300 ${
                        inCart
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100/60'
                          : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95 shadow-md shadow-teal-50'
                      }`}
                    >
                      {inCart ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{t('itemAdded')} ({cartQty})</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('addToCart')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Empty search/filter outputs */
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200" id="empty-catalog-results">
          <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            {currentLang === 'ru' 
              ? 'Препараты не найдены' 
              : currentLang === 'ar' 
              ? 'لم يتم العثور على أدوية' 
              : 'No medicines match your filter/search'}
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
            {currentLang === 'ru' 
              ? 'Попробуйте изменить поисковый запрос или выбрать другую категорию товаров.' 
              : 'Try renaming your query or switching target category flags.'}
          </p>
        </div>
      )}
    </div>
  );
}
