/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { useState, useRef } from 'react';
import type { TouchEvent } from 'react';
import { Product, Language, CartItem, User } from '../types';
import { MEDICINES_DATA, TRANSLATIONS } from '../data';
import { resolvePrice, getPrimaryVolume, unitLabel } from '../currency';
import { renderRichText } from '../richText';
import { Star, Check, Plus, ShoppingCart, HelpCircle, BellRing, BellOff, ChevronDown, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { motion } from 'motion/react';
import defaultCategoryIcon from '../assets/nadeck-icon-red.png';
import defaultCategoryIconActive from '../assets/nadeck-icon-blue.png';

interface MedicineGridProps {
  currentLang: Language;
  onSelectMedicine: (medicine: Product) => void;
  cart: CartItem[];
  onAddToCart: (medicine: Product, quantity?: number, selectedVolume?: number, unitPrice?: number, unitPriceUsd?: number) => void;
  searchQuery: string;
  allMedicines?: Product[];
  user: User;
  setAuthModalOpen: (open: boolean) => void;
  subscribedIds: string[];
  onSubscribeNotify: (medicineId: string) => void;
  categoryFilters: Array<{ id: string; label: string; icon?: string | null }>;
  categoryLabelById: Record<string, string>;
  categoryIconById: Record<string, string | null | undefined>;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function MedicineGrid({
  currentLang,
  onSelectMedicine,
  cart,
  onAddToCart,
  searchQuery,
  allMedicines,
  user,
  setAuthModalOpen,
  subscribedIds,
  onSubscribeNotify,
  categoryFilters,
  categoryLabelById,
  categoryIconById,
  selectedCategory,
  onSelectCategory
}: MedicineGridProps) {
  const [selectedVolumes, setSelectedVolumes] = useState<Record<string, number>>({});
  // Which photo each card is currently showing - lets shoppers flip through a product's
  // gallery right from the catalog card, without opening the detail page.
  const [cardImageIndex, setCardImageIndex] = useState<Record<string, number>>({});

  // Swipe-to-flip on touch devices. A swipe should switch the photo instead of navigating
  // into the product, so a completed swipe suppresses the click that follows it on mobile.
  const touchStartRef = useRef<{ id: string; x: number } | null>(null);
  const swipedRef = useRef(false);

  const handleThumbTouchStart = (medId: string) => (e: TouchEvent) => {
    touchStartRef.current = { id: medId, x: e.touches[0].clientX };
  };

  const handleThumbTouchEnd = (medId: string, images: string[], activeIndex: number) => (e: TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || start.id !== medId || images.length < 2) return;
    const delta = e.changedTouches[0].clientX - start.x;
    if (Math.abs(delta) > 40) {
      swipedRef.current = true;
      const nextIndex = delta > 0
        ? (activeIndex === 0 ? images.length - 1 : activeIndex - 1)
        : (activeIndex === images.length - 1 ? 0 : activeIndex + 1);
      setCardImageIndex((prev) => ({ ...prev, [medId]: nextIndex }));
    }
  };

  const handleThumbClick = (med: Product) => {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    onSelectMedicine(med);
  };

  const t = (key: string) => {
    return TRANSLATIONS[key]?.[currentLang] || key;
  };

  const categories = [{ id: 'all', label: t('categoriesAll') }, ...categoryFilters];

  const activeMedicines = allMedicines && allMedicines.length > 0 ? allMedicines : MEDICINES_DATA;

  // Filter medicines based on category AND search input
  const filteredMedicines = activeMedicines.filter((med) => {
    const matchesCategory = selectedCategory === 'all' || med.category === selectedCategory;
    
    const query = searchQuery.toLowerCase();
    const nameMatch = med.name[currentLang]?.toLowerCase().includes(query) || med.name['en']?.toLowerCase().includes(query);
    const descMatch = med.description[currentLang]?.toLowerCase().includes(query);

    return matchesCategory && (nameMatch || descMatch);
  });


  return (
    <div className="space-y-8" id="catalog-section">
      
      {/* Categories Filter */}
      <div
        className="flex flex-wrap justify-start gap-1"
        id="category-filters-container"
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const hasCustomIcon = cat.id !== 'all' && !!cat.icon;
          const iconSrc = cat.id === 'all'
            ? null
            : hasCustomIcon
            ? cat.icon
            : (isSelected ? defaultCategoryIconActive : defaultCategoryIcon);

          return (
            <button
              key={cat.id}
              id={`filter-btn-${cat.id}`}
              onClick={() => onSelectCategory(cat.id)}
              className="flex flex-col items-center gap-2 w-24 sm:w-28 shrink-0 px-1 py-2 rounded-2xl transition-colors"
            >
              <span
                className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-all ${
                  isSelected ? (hasCustomIcon ? 'bg-nadeck-50 ring-2 ring-nadeck-500' : 'bg-nadeck-50') : ''
                }`}
              >
                {iconSrc ? (
                  <img src={iconSrc} alt="" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
                ) : (
                  <LayoutGrid
                    className={`w-9 h-9 sm:w-10 sm:h-10 ${isSelected ? 'text-nadeck-600' : 'text-rose-400'}`}
                    strokeWidth={1.5}
                  />
                )}
              </span>
              <span
                className={`text-[11px] sm:text-xs font-semibold text-center leading-tight ${
                  isSelected ? 'text-nadeck-700' : 'text-slate-500'
                }`}
              >
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid container */}
      {filteredMedicines.length > 0 ? (
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8" 
          id="medicines-grid-layout"
        >
          {filteredMedicines.map((med, index) => {
            const isOutOfStock = med.inStock === false;
            const isSubscribed = subscribedIds.includes(med.id);
            const images = med.images && med.images.length > 0 ? med.images : [''];
            const activeImageIndex = cardImageIndex[med.id] ?? 0;
            const showPrevImage = () =>
              setCardImageIndex((prev) => ({ ...prev, [med.id]: activeImageIndex === 0 ? images.length - 1 : activeImageIndex - 1 }));
            const showNextImage = () =>
              setCardImageIndex((prev) => ({ ...prev, [med.id]: activeImageIndex === images.length - 1 ? 0 : activeImageIndex + 1 }));
            const availableVolumes = med.volumes && med.volumes.length > 0 ? med.volumes : [getPrimaryVolume(med)];
            const volumeUnitLabel = unitLabel(med.unit);
            const currentVolume = selectedVolumes[med.id] ?? med.mgPerUnit;
            const currentVolumeInfo = availableVolumes.find((v) => v.mgPerUnit === currentVolume) || availableVolumes[0];
            const cartQty = cart.find(item => item.medicine.id === med.id && item.selectedStrength === currentVolumeInfo.mgPerUnit)?.quantity || 0;
            const inCart = cartQty > 0;

            const handleNotifyClick = () => {
              if (!user.isAuthenticated) {
                setAuthModalOpen(true);
                return;
              }
              onSubscribeNotify(med.id);
            };

            const categoryLabel = categoryLabelById[med.category] || med.category;

            return (
              <motion.div
                key={med.id}
                id={`medicine-card-${med.id}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group flex flex-col bg-white rounded-3xl border border-slate-100/80 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-350 overflow-hidden"
              >
                
                {/* Visual Thumbnail (product-shot style) */}
                <div
                  className="aspect-[4/3] w-full relative bg-slate-50 cursor-pointer overflow-hidden p-6"
                  onClick={() => handleThumbClick(med)}
                  onTouchStart={handleThumbTouchStart(med.id)}
                  onTouchEnd={handleThumbTouchEnd(med.id, images, activeImageIndex)}
                  id={`thumbnail-${med.id}`}
                >
                  <img
                    src={images[activeImageIndex]}
                    alt={med.name[currentLang]}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Category Badge overlay */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] uppercase font-bold rounded-full border text-nadeck-800 bg-nadeck-50/90 border-nadeck-100/50">
                    {categoryLabel}
                  </span>
                  {/* Score */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-xs py-0.5 px-2 rounded-full border border-slate-100 text-amber-500 text-xs font-extrabold select-none">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="text-slate-800 text-[10.5px]">{med.rating}</span>
                  </div>
                  {/* Photo gallery controls - flip through a product's photos right from the card */}
                  {images.length > 1 && (
                    <>
                      <button
                        id={`thumbnail-prev-${med.id}`}
                        type="button"
                        aria-label="Previous photo"
                        onClick={(e) => { e.stopPropagation(); showPrevImage(); }}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-white/85 hover:bg-white text-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`thumbnail-next-${med.id}`}
                        type="button"
                        aria-label="Next photo"
                        onClick={(e) => { e.stopPropagation(); showNextImage(); }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-white/85 hover:bg-white text-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1 z-10">
                        {images.map((_, imgIdx) => (
                          <button
                            key={imgIdx}
                            type="button"
                            aria-label={`Photo ${imgIdx + 1}`}
                            onClick={(e) => { e.stopPropagation(); setCardImageIndex((prev) => ({ ...prev, [med.id]: imgIdx })); }}
                            className={`h-1.5 rounded-full transition-all ${
                              imgIdx === activeImageIndex ? 'w-3.5 bg-nadeck-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  {/* Out of stock overlay */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-slate-950/55 flex items-center justify-center">
                      <span className="px-3 py-1.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                        {t('outOfStock')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Body details */}
                <div className="p-5 flex-1 flex flex-col gap-4">
                  <div className="space-y-2">
                    {/* Medicine Name */}
                    <h3
                      className="text-lg font-extrabold text-slate-950 group-hover:text-nadeck-600 cursor-pointer transition-colors leading-snug line-clamp-1"
                      onClick={() => onSelectMedicine(med)}
                      id={`title-${med.id}`}
                    >
                      {med.name[currentLang]}
                    </h3>

                    {/* Brief desc */}
                    <p className="text-xs text-slate-500 leading-relaxed font-normal min-h-[36px] line-clamp-2">
                      {renderRichText(med.description[currentLang], `desc-${med.id}`)}
                    </p>
                  </div>

                  {/* Price and Volume selector */}
                  <div className="flex items-end justify-between gap-3">
                    <span id={`price-${med.id}`} className="text-xl font-black text-slate-900">
                      {resolvePrice(currentVolumeInfo.price, currentVolumeInfo.priceUsd, currentVolumeInfo.priceSar, currentLang).toLocaleString()} {t('currencySymbol')}
                    </span>
                    <div className="space-y-1.5 w-28 shrink-0">
                      <span className="block text-[10px] text-slate-400 font-medium text-right">{t('volumeLabel')}</span>
                      <div className="relative">
                        <select
                          id={`volume-select-${med.id}`}
                          value={currentVolume}
                          onChange={(e) => setSelectedVolumes((prev) => ({ ...prev, [med.id]: Number(e.target.value) }))}
                          className="w-full appearance-none px-3 py-2.5 pr-8 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-nadeck-100 focus:border-nadeck-300"
                        >
                          {availableVolumes.map((vol) => (
                            <option key={vol.mgPerUnit} value={vol.mgPerUnit}>
                              {vol.mgPerUnit} {volumeUnitLabel}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 mt-auto border-t border-slate-100/70 flex items-center gap-2">
                    {/* More details */}
                    <button
                      id={`details-btn-${med.id}`}
                      onClick={() => onSelectMedicine(med)}
                      className="flex-1 px-4 py-2.5 rounded-2xl font-bold text-xs border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all duration-300"
                    >
                      {t('moreDetailsBtn')}
                    </button>

                    {/* Cart operations / Notify Me when unavailable */}
                    {isOutOfStock ? (
                      <button
                        id={`notify-btn-${med.id}`}
                        onClick={handleNotifyClick}
                        disabled={isSubscribed}
                        className={`flex-1 px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-300 ${
                          isSubscribed
                            ? 'bg-slate-50 text-slate-500 border border-slate-200 cursor-default'
                            : 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95 shadow-md shadow-amber-50'
                        }`}
                      >
                        {isSubscribed ? (
                          <>
                            <BellOff className="w-3.5 h-3.5" />
                            <span>{t('notifySubscribedBtn')}</span>
                          </>
                        ) : (
                          <>
                            <BellRing className="w-3.5 h-3.5" />
                            <span>{t('notifyMeBtn')}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        id={`add-to-cart-btn-${med.id}`}
                        onClick={() => onAddToCart(med, 1, currentVolumeInfo.mgPerUnit, currentVolumeInfo.price, currentVolumeInfo.priceUsd)}
                        className={`flex-1 px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-300 ${
                          inCart
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100/60'
                            : 'bg-nadeck-600 text-white hover:bg-nadeck-700 active:scale-95 shadow-md shadow-nadeck-50'
                        }`}
                      >
                        {inCart ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{cartQty}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>{t('addToCart')}</span>
                          </>
                        )}
                      </button>
                    )}
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
