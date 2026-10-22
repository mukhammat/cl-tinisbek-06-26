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
import { Star, Check, Plus, HelpCircle, ExternalLink, BellRing, BellOff, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

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
  // The product shown as the open card. undefined = the first one in the current list,
  // null = the shopper closed it and every product is a compact tile.
  const [expandedId, setExpandedId] = useState<string | null | undefined>(undefined);
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

  // No "All" pill: one category is always selected (App defaults to the first by sortOrder).
  const categories = categoryFilters;

  const activeMedicines = allMedicines && allMedicines.length > 0 ? allMedicines : MEDICINES_DATA;

  // Filter medicines by the selected category, or - while searching - across the whole
  // catalog, since without an "All" pill a match in another category would stay hidden.
  const filteredMedicines = activeMedicines.filter((med) => {
    const matchesCategory = !!searchQuery || selectedCategory === 'all' || med.category === selectedCategory;

    const query = searchQuery.toLowerCase();
    const nameMatch = med.name[currentLang]?.toLowerCase().includes(query) || med.name['en']?.toLowerCase().includes(query);
    const descMatch = med.description[currentLang]?.toLowerCase().includes(query);

    return matchesCategory && (nameMatch || descMatch);
  });

  const openId = expandedId === null
    ? null
    : filteredMedicines.some((med) => med.id === expandedId) ? expandedId : filteredMedicines[0]?.id;


  return (
    <div className="space-y-4 scroll-mt-28" id="catalog-section">

      {/* Categories Filter: a single scrollable row of pills */}
      <div
        className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
        id="category-filters-container"
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const iconSrc = cat.icon || null;

          return (
            <button
              key={cat.id}
              id={`filter-btn-${cat.id}`}
              onClick={() => onSelectCategory(cat.id)}
              className={`shrink-0 h-11 px-5 rounded-full flex items-center gap-2 text-[15px] whitespace-nowrap border transition-colors ${
                isSelected
                  ? 'bg-nadeck-800 border-nadeck-800 text-white'
                  : 'bg-white/70 border-slate-300 text-slate-800 hover:bg-white'
              }`}
            >
              {iconSrc && <img src={iconSrc} alt="" className="w-5 h-5 object-contain" />}
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Grid container: one product open as a full-width card, the rest as compact tiles
          that open in place when tapped */}
      {filteredMedicines.length > 0 ? (
        <div
          className="grid grid-cols-2 lg:grid-cols-4 grid-flow-row-dense gap-2 sm:gap-3"
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
            const volumeUnitLabel = unitLabel(med.unit, currentLang);
            const currentVolume = selectedVolumes[med.id] ?? med.mgPerUnit;
            const currentVolumeInfo = availableVolumes.find((v) => v.mgPerUnit === currentVolume) || availableVolumes[0];
            const cartQty = cart.find(item => item.medicine.id === med.id && item.selectedStrength === currentVolumeInfo.mgPerUnit)?.quantity || 0;
            const inCart = cartQty > 0;
            const categoryLabel = categoryLabelById[med.category] || med.category;

            const handleNotifyClick = () => {
              if (!user.isAuthenticated) {
                setAuthModalOpen(true);
                return;
              }
              onSubscribeNotify(med.id);
            };

            if (med.id !== openId) {
              return (
                <motion.button
                  key={med.id}
                  type="button"
                  id={`medicine-card-${med.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(index, 12) * 0.03 }}
                  onClick={() => setExpandedId(med.id)}
                  aria-expanded={false}
                  className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-white rounded-2xl border border-slate-200/80 text-start hover:shadow-md transition-shadow"
                >
                  <span className="relative w-12 h-14 sm:w-14 sm:h-16 shrink-0 rounded-xl bg-slate-900 overflow-hidden">
                    {images[0] && (
                      <img src={images[0]} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    )}
                    {isOutOfStock && <span className="absolute inset-0 bg-slate-950/50" />}
                  </span>
                  <span className="flex-1 min-w-0 flex flex-col items-start gap-1">
                    <span id={`title-${med.id}`} className="text-[15px] sm:text-base font-medium text-slate-900 leading-tight line-clamp-2">
                      {med.name[currentLang]}
                    </span>
                    <span className="max-w-full px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-600 truncate">
                      {isOutOfStock ? t('outOfStock') : categoryLabel}
                    </span>
                  </span>
                  <span className="w-7 h-7 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </motion.button>
              );
            }

            return (
              <motion.article
                key={med.id}
                id={`medicine-card-${med.id}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="col-span-2 lg:row-span-4 bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-sm flex flex-col gap-4"
              >
                <div className="flex gap-4 sm:gap-6">
                  <div className="flex-1 min-w-0 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        id={`title-${med.id}`}
                        onClick={() => onSelectMedicine(med)}
                        className="text-xl sm:text-2xl font-medium text-slate-900 leading-tight cursor-pointer hover:text-nadeck-600 transition-colors"
                      >
                        {med.name[currentLang]}
                      </h3>
                      <button
                        type="button"
                        aria-label={currentLang === 'ru' ? 'Свернуть' : 'Collapse'}
                        aria-expanded={true}
                        onClick={() => setExpandedId(null)}
                        className="w-8 h-8 shrink-0 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
                      >
                        <ChevronDown className="w-4 h-4 rotate-180" />
                      </button>
                    </div>
                    <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed line-clamp-5">
                      {renderRichText(med.description[currentLang], `desc-${med.id}`)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-700">{categoryLabel}</span>
                      <span className="px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-700 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {med.rating}
                      </span>
                    </div>
                  </div>

                  {/* Product photo on a dark plate, with the gallery controls */}
                  <div
                    className="group relative w-32 h-40 sm:w-48 sm:h-56 shrink-0 rounded-2xl bg-slate-900 overflow-hidden cursor-pointer"
                    onClick={() => handleThumbClick(med)}
                    onTouchStart={handleThumbTouchStart(med.id)}
                    onTouchEnd={handleThumbTouchEnd(med.id, images, activeImageIndex)}
                    id={`thumbnail-${med.id}`}
                  >
                    {images[activeImageIndex] && (
                      <img
                        src={images[activeImageIndex]}
                        alt={med.name[currentLang]}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    )}
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
                        <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1 z-10">
                          {images.map((_, imgIdx) => (
                            <button
                              key={imgIdx}
                              type="button"
                              aria-label={`Photo ${imgIdx + 1}`}
                              onClick={(e) => { e.stopPropagation(); setCardImageIndex((prev) => ({ ...prev, [med.id]: imgIdx })); }}
                              className={`h-1.5 rounded-full transition-all ${
                                imgIdx === activeImageIndex ? 'w-3.5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-slate-950/55 flex items-center justify-center">
                        <span className="px-3 py-1.5 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                          {t('outOfStock')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price and pack size */}
                <div className="flex items-center justify-between gap-3">
                  <span id={`price-${med.id}`} className="text-2xl font-medium text-slate-900">
                    {resolvePrice(currentVolumeInfo.price, currentVolumeInfo.priceUsd, currentLang).toLocaleString()} {t('currencySymbol')}
                  </span>
                  <div className="relative w-32 shrink-0">
                    <select
                      id={`volume-select-${med.id}`}
                      aria-label={t('volumeLabel')}
                      value={currentVolume}
                      onChange={(e) => setSelectedVolumes((prev) => ({ ...prev, [med.id]: Number(e.target.value) }))}
                      className="w-full appearance-none h-11 px-4 pr-9 rounded-full border border-slate-300 bg-white text-sm font-medium text-slate-800 cursor-pointer focus:outline-none focus:border-nadeck-500"
                    >
                      {availableVolumes.map((vol) => (
                        <option key={vol.mgPerUnit} value={vol.mgPerUnit}>
                          {vol.mgPerUnit} {volumeUnitLabel}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2.5">
                  {isOutOfStock ? (
                    <button
                      id={`notify-btn-${med.id}`}
                      onClick={handleNotifyClick}
                      disabled={isSubscribed}
                      className={`h-12 rounded-xl text-[15px] font-medium flex items-center justify-center gap-2 transition-colors ${
                        isSubscribed ? 'bg-slate-100 text-slate-500 cursor-default' : 'bg-nadeck-800 text-white hover:bg-nadeck-900'
                      }`}
                    >
                      {isSubscribed ? <BellOff className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
                      {isSubscribed ? t('notifySubscribedBtn') : t('notifyMeBtn')}
                    </button>
                  ) : (
                    <button
                      id={`add-to-cart-btn-${med.id}`}
                      onClick={() => onAddToCart(med, 1, currentVolumeInfo.mgPerUnit, currentVolumeInfo.price, currentVolumeInfo.priceUsd)}
                      className={`h-12 rounded-xl text-[15px] font-medium flex items-center justify-center gap-2 transition-colors ${
                        inCart ? 'bg-nadeck-100 text-nadeck-800 hover:bg-nadeck-200' : 'bg-nadeck-800 text-white hover:bg-nadeck-900'
                      }`}
                    >
                      {inCart ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {inCart ? `${t('addToCart')} · ${cartQty}` : t('addToCart')}
                    </button>
                  )}
                  <button
                    id={`details-btn-${med.id}`}
                    onClick={() => onSelectMedicine(med)}
                    className="h-12 rounded-xl border border-slate-300 text-[15px] font-medium text-slate-800 hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t('moreDetailsBtn')}
                  </button>
                </div>
              </motion.article>
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
