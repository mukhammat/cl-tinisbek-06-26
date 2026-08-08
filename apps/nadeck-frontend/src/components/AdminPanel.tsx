/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, Order, Language, SUPPORTED_LANGUAGES, Category, DosageFrequency, SiteMarket, PromoCodeStats, DeliveryCountry } from '../types';
import { unitLabel } from '../currency';
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
  AlertTriangle,
  Languages,
  Loader2,
  Upload,
  Images,
  Ticket,
  Users,
  Power
} from 'lucide-react';
import defaultCategoryIcon from '../assets/nadeck-icon-red.png';
import { motion, AnimatePresence } from 'motion/react';
import MediaLibraryModal from './MediaLibraryModal';

// The product form edits one photo gallery per storefront: `images` is nadeck.net's,
// `imagesAr` is ar.nadeck.net's. Leaving one empty is fine - the backend serves the other
// market's photos there instead of nothing.
type ProductImageField = 'images' | 'imagesAr';

// Stand-in cover for a product saved without a single photo in either gallery.
const DEFAULT_PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1579154204601-01588f351166?w=600&auto=format&fit=crop&q=80';

interface AdminPanelProps {
  currentLang: Language;
  onRefreshMedicines: () => void;
  onRefreshCategories: () => void;
  allMedicines: Product[];
  categories: Category[];
  token?: string;
  // Present only for a market-scoped admin (see User.adminMarket) - null/absent means a full
  // admin with no market restriction. allMedicines is already server-filtered to this market;
  // this only drives what the product form's market controls look like.
  adminMarket?: SiteMarket | null;
}

export default function AdminPanel({
  currentLang,
  onRefreshMedicines,
  onRefreshCategories,
  allMedicines,
  categories,
  token,
  adminMarket
}: AdminPanelProps) {
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'categories' | 'orders' | 'promo' | 'delivery'>('products');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Promo codes tab: the list already carries each code's usage stats from the server.
  const [promoCodes, setPromoCodes] = useState<PromoCodeStats[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoSaving, setPromoSaving] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoPartner, setNewPromoPartner] = useState('');
  const [newPromoPercent, setNewPromoPercent] = useState('10');
  const [newPromoMaxUses, setNewPromoMaxUses] = useState('');
  const [newPromoExpires, setNewPromoExpires] = useState('');

  // Delivery tab: destination countries and their shipping fees.
  const [deliveryCountries, setDeliveryCountries] = useState<DeliveryCountry[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [newCountryCode, setNewCountryCode] = useState('');
  const [newCountryNames, setNewCountryNames] = useState<Record<Language, string>>({ ru: '', en: '', ar: '' });
  const [newCountryPriceKzt, setNewCountryPriceKzt] = useState('');
  const [newCountryPriceUsd, setNewCountryPriceUsd] = useState('');
  const [newCountryPriceSar, setNewCountryPriceSar] = useState('');
  const [newCountryMarkets, setNewCountryMarkets] = useState<SiteMarket[]>([adminMarket || 'main']);
  // Editing an existing row's prices in place - the whole point of the tab is changing rates.
  const [editingCountry, setEditingCountry] = useState<string | null>(null);
  const [editCountryPrices, setEditCountryPrices] = useState<{ kzt: string; usd: string; sar: string }>({ kzt: '', usd: '', sar: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search filter
  const [prodSearch, setProdSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // CRUD state
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});

  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState<Partial<Category>>({});
  const [locCategoryNames, setLocCategoryNames] = useState<Record<Language, string>>({ ru: '', en: '', ar: '' });
  const [isTranslatingCategory, setIsTranslatingCategory] = useState(false);
  const [isTranslatingProduct, setIsTranslatingProduct] = useState(false);
  const [isUploadingCategoryIcon, setIsUploadingCategoryIcon] = useState(false);
  // Which of the two per-storefront galleries is currently uploading (null = neither), so an
  // upload into one gallery doesn't lock the other one's buttons.
  const [uploadingImageField, setUploadingImageField] = useState<ProductImageField | null>(null);

  // Volumes list (mg + own price in KZT, USD and SAR) available for the product, plus the pending "new volume" inputs
  const [volumesList, setVolumesList] = useState<{ mgPerUnit: number; price: number; priceUsd: number; priceSar: number }[]>([]);
  const [newVolumeMg, setNewVolumeMg] = useState('');
  const [newVolumePrice, setNewVolumePrice] = useState('');
  const [newVolumePriceUsd, setNewVolumePriceUsd] = useState('');
  const [newVolumePriceSar, setNewVolumePriceSar] = useState('');

  // Localized form inputs
  const [locNames, setLocNames] = useState<Record<Language, string>>({ ru: '', en: '', ar: '' });
  const [locDescs, setLocDescs] = useState<Record<Language, string>>({ ru: '', en: '', ar: '' });
  const [locFullDescs, setLocFullDescs] = useState<Record<Language, string>>({ ru: '', en: '', ar: '' });
  const [locUsages, setLocUsages] = useState<Record<Language, string>>({ ru: '', en: '', ar: '' });
  const [locInds, setLocInds] = useState<Record<Language, string>>({ ru: '', en: '', ar: '' }); // comma or newline separated
  const [locContras, setLocContras] = useState<Record<Language, string>>({ ru: '', en: '', ar: '' }); // comma or newline

  const activeCategories = categories.filter((category) => category.isActive !== false);
  const categoryLabelById = Object.fromEntries(
    categories.map((category) => [category.id, category.name[currentLang] || category.name.en || category.id])
  );
  // Each storefront has its own category rows, so the product form offers each market only its
  // own - picking across markets is what leaves a product filed under a category that doesn't
  // exist on the site showing it (the storefront then falls back to printing the raw id).
  const categoriesForMarket = (market: SiteMarket) =>
    activeCategories.filter((category) =>
      (category.markets && category.markets.length > 0 ? category.markets : ['main']).includes(market)
    );
  const mainCategories = categoriesForMarket('main');
  const arCategories = categoriesForMarket('ar');
  // Single source of truth for "no category picked yet" - reused everywhere a default is needed below.
  const defaultCategoryId = (adminMarket === 'ar' ? arCategories : mainCategories)[0]?.id || activeCategories[0]?.id || 'weightloss';
  const defaultCategoryIdAr = adminMarket === 'ar' ? (arCategories[0]?.id || '') : '';

  // Clinical/dosing fields (indications, dosageRules, mg strength, ...) only apply to peptides -
  // additional goods (syringes, vitamins, protein, ...) only need a name, image and a priced volume.
  const isPeptideForm = (formData.type || 'peptide') === 'peptide';
  const volumeUnitLabel = unitLabel(formData.unit || 'mg', currentLang);

  // Fetch orders
  const fetchAllOrders = () => {
    setOrdersLoading(true);
    fetch('/api/admin/orders', { headers: authHeaders })
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

  // Fetch promo codes together with their usage stats
  const fetchPromoCodes = () => {
    setPromoLoading(true);
    fetch('/api/admin/promo-codes', { headers: authHeaders })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load promo codes');
        return res.json();
      })
      .then((data) => {
        setPromoCodes(data);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg(currentLang === 'ru' ? 'Не удалось загрузить промокоды' : 'Error loading promo codes');
      })
      .finally(() => {
        setPromoLoading(false);
      });
  };

  const fetchDeliveryCountries = () => {
    setDeliveryLoading(true);
    fetch('/api/admin/delivery-countries', { headers: authHeaders })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load delivery countries');
        return res.json();
      })
      .then((data) => {
        setDeliveryCountries(data);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg(currentLang === 'ru' ? 'Не удалось загрузить страны доставки' : 'Error loading delivery countries');
      })
      .finally(() => {
        setDeliveryLoading(false);
      });
  };

  useEffect(() => {
    if (activeSubTab === 'orders') {
      fetchAllOrders();
    }
    if (activeSubTab === 'promo') {
      fetchPromoCodes();
    }
    if (activeSubTab === 'delivery') {
      fetchDeliveryCountries();
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

  // Which field the R2 gallery is currently picking for (null = closed).
  const [mediaLibraryTarget, setMediaLibraryTarget] = useState<'category-icon' | ProductImageField | null>(null);

  // Uploads a single image file to R2 (via the backend) and resolves with its public URL.
  const uploadImage = (file: File, folder: 'categories' | 'medicines'): Promise<string> => {
    const body = new FormData();
    body.append('file', file);

    return fetch(`/api/upload?folder=${folder}`, {
      method: 'POST',
      headers: authHeaders,
      body,
    }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Upload failed');
      }
      const data = await res.json();
      return data.url as string;
    });
  };

  // Uploads every selected file (multi-select is allowed) and appends the resulting URLs to
  // the given storefront's photo gallery - existing photos are kept, not replaced.
  const handleAddProductImages = (files: FileList | null, field: ProductImageField) => {
    if (!files || files.length === 0) return;
    setUploadingImageField(field);
    Promise.all(Array.from(files).map((file) => uploadImage(file, 'medicines')))
      .then((urls) => setFormData((prev) => ({ ...prev, [field]: [...(prev[field] || []), ...urls] })))
      .catch((err) => showFeedback('error', err.message || (currentLang === 'ru' ? 'Не удалось загрузить изображение' : 'Could not upload image')))
      .finally(() => setUploadingImageField(null));
  };

  const handleRemoveProductImage = (index: number, field: ProductImageField) => {
    setFormData((prev) => ({ ...prev, [field]: (prev[field] || []).filter((_, i) => i !== index) }));
  };

  // Both storefronts' galleries are managed identically (upload, pick from R2, remove), so the
  // block is rendered once per market instead of being duplicated in the form markup.
  const renderProductGallery = (field: ProductImageField, label: string, hint: string) => {
    const gallery = formData[field] || [];
    const isUploading = uploadingImageField === field;
    // The nadeck.net gallery keeps the original element ids; the Arabic one gets the suffix.
    const idSuffix = field === 'images' ? '' : '-ar';
    const uploadInputId = `form-input-image-upload${idSuffix}`;

    return (
      <div>
        <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
          {label}
        </label>
        <div className="flex flex-wrap items-center gap-2" id={`form-images-gallery${idSuffix}`}>
          {gallery.map((url, index) => (
            <div
              key={`${url}-${index}`}
              id={`form-image-thumb${idSuffix}-${index}`}
              className="relative w-14 h-14 rounded-2xl border border-slate-200 bg-slate-50 shrink-0 overflow-hidden group"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
              {index === 0 && (
                <span className="absolute bottom-0 inset-x-0 bg-nadeck-600/90 text-white text-[7px] font-bold text-center leading-tight py-0.5">
                  {currentLang === 'ru' ? 'Обложка' : 'Cover'}
                </span>
              )}
              <button
                type="button"
                id={`form-image-remove${idSuffix}-${index}`}
                onClick={() => handleRemoveProductImage(index, field)}
                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-white/90 hover:bg-rose-50 text-slate-500 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title={currentLang === 'ru' ? 'Удалить фото' : 'Remove photo'}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <label
            htmlFor={uploadInputId}
            className={`flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl border border-dashed border-slate-300 text-slate-400 hover:border-nadeck-400 hover:text-nadeck-600 text-[9px] font-bold transition-colors ${
              isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
            }`}
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {currentLang === 'ru' ? 'Добавить' : 'Add'}
          </label>
          <input
            id={uploadInputId}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={isUploading}
            onChange={(e) => {
              handleAddProductImages(e.target.files, field);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            id={`btn-product-images-library${idSuffix}`}
            onClick={() => setMediaLibraryTarget(field)}
            className="flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-2xl border border-dashed border-slate-300 text-slate-400 hover:border-nadeck-400 hover:text-nadeck-600 text-[9px] font-bold transition-colors"
            title={currentLang === 'ru' ? 'Выбрать из хранилища' : 'Pick from storage'}
          >
            <Images className="w-4 h-4" />
            {currentLang === 'ru' ? 'Из R2' : 'From R2'}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5">{hint}</p>
      </div>
    );
  };

  // Toggle Stock Status
  const handleToggleStock = (med: Product) => {
    const updatedMed = {
      ...med,
      inStock: !med.inStock
    };

    fetch(`/api/medicines/${med.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
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
    if (!window.confirm(`Are you sure you want to delete "${nameen}"?`)) return;

    fetch(`/api/medicines/${medId}`, {
      method: 'DELETE',
      headers: authHeaders
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete product');
        return res.json();
      })
      .then(() => {
        onRefreshMedicines();
        showFeedback('success', 'Product deleted successfully!');
      })
      .catch((err) => {
        console.error(err);
        showFeedback('error', 'Error deleting product');
      });
  };

  // Update order status
  const handleUpdateOrderStatus = (orderId: string, status: string) => {
    fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
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
  const startEditProduct = (med: Product) => {
    setFormData(med);
    setVolumesList([...(med.volumes || [])]);
    setNewVolumeMg('');
    setNewVolumePrice('');
    setNewVolumePriceUsd('');
    setLocNames({ ...med.name });
    setLocDescs({ ...med.description });
    setLocFullDescs({ ...med.fullDescription });
    setLocUsages({ ...med.usage || { ru: '', en: '', ar: '' } });

    setLocInds({
      ru: (med.indications?.ru || []).join('\n'),
      en: (med.indications?.en || []).join('\n'),
      ar: (med.indications?.ar || []).join('\n')
    });
    setLocContras({
      ru: (med.contraindications?.ru || []).join('\n'),
      en: (med.contraindications?.en || []).join('\n'),
      ar: (med.contraindications?.ar || []).join('\n')
    });

    setIsEditing(true);
    setIsAdding(false);
  };

  // Open Add Form
  const startAddProduct = () => {
    setFormData({
      id: '',
      type: 'peptide',
      unit: 'mg',
      category: defaultCategoryId,
      categoryAr: defaultCategoryIdAr,
      images: [DEFAULT_PRODUCT_IMAGE],
      // Left empty on purpose: ar.nadeck.net shows the photos above until someone uploads
      // pictures specific to that storefront.
      imagesAr: [],
      rating: 5.0,
      form: 'vial',
      mgPerUnit: 5,
      dosageRules: {
        mgPerKgPerDay: 0.005,
        defaultDailyDoses: 1
      },
      inStock: true,
      markets: [adminMarket || 'main']
    });
    setVolumesList([{ mgPerUnit: 5, price: 15000, priceUsd: 50 }]);
    setNewVolumeMg('');
    setNewVolumePrice('');
    setNewVolumePriceUsd('');
    setLocNames({ ru: '', en: '', ar: '' });
    setLocDescs({ ru: '', en: '', ar: '' });
    setLocFullDescs({ ru: '', en: '', ar: '' });
    setLocUsages({ ru: '', en: '', ar: '' });
    setLocInds({ ru: '', en: '', ar: '' });
    setLocContras({ ru: '', en: '', ar: '' });

    setIsAdding(true);
    setIsEditing(false);
    setIsAddingCategory(false);
    setIsEditingCategory(false);
  };

  const startAddCategory = () => {
    setCategoryForm({
      id: '',
      sortOrder: categories.length,
      isActive: true,
      markets: [adminMarket || 'main'],
    });
    setLocCategoryNames({ ru: '', en: '', ar: '' });
    setIsAddingCategory(true);
    setIsEditingCategory(false);
    setIsAdding(false);
    setIsEditing(false);
  };

  const startEditCategory = (category: Category) => {
    setCategoryForm(category);
    setLocCategoryNames({ ...category.name });
    setIsEditingCategory(true);
    setIsAddingCategory(false);
    setIsAdding(false);
    setIsEditing(false);
  };

  // Add a new volume (mg + its own KZT/USD/SAR price) to the pending list, or update the
  // prices of an existing volume when the mg value already matches one in the list. SAR is
  // optional (unlike KZT/USD) - it's only ever shown on ar.nadeck.net, so a main-only product
  // has no reason to require one.
  const handleAddVolume = () => {
    const mg = Number(newVolumeMg);
    const price = Number(newVolumePrice);
    const priceUsd = Number(newVolumePriceUsd);
    const priceSar = newVolumePriceSar ? Number(newVolumePriceSar) : 0;
    if (!newVolumeMg || Number.isNaN(mg) || mg <= 0) {
      showFeedback('error', currentLang === 'ru' ? 'Введите корректное значение объёма (мг)' : 'Enter a valid volume value (mg)');
      return;
    }
    if (!newVolumePrice || Number.isNaN(price) || price < 0) {
      showFeedback('error', currentLang === 'ru' ? 'Введите корректную цену в тенге для этого объёма' : 'Enter a valid KZT price for this volume');
      return;
    }
    if (!newVolumePriceUsd || Number.isNaN(priceUsd) || priceUsd < 0) {
      showFeedback('error', currentLang === 'ru' ? 'Введите корректную цену в долларах для этого объёма' : 'Enter a valid USD price for this volume');
      return;
    }
    if (newVolumePriceSar && (Number.isNaN(priceSar) || priceSar < 0)) {
      showFeedback('error', currentLang === 'ru' ? 'Введите корректную цену в риалах для этого объёма' : 'Enter a valid SAR price for this volume');
      return;
    }
    const existingIndex = volumesList.findIndex((v) => v.mgPerUnit === mg);
    if (existingIndex >= 0) {
      setVolumesList(volumesList.map((v, i) => (i === existingIndex ? { mgPerUnit: mg, price, priceUsd, priceSar } : v)));
    } else {
      setVolumesList([...volumesList, { mgPerUnit: mg, price, priceUsd, priceSar }].sort((a, b) => a.mgPerUnit - b.mgPerUnit));
    }
    setNewVolumeMg('');
    setNewVolumePrice('');
    setNewVolumePriceUsd('');
    setNewVolumePriceSar('');
  };

  const handleRemoveVolume = (mg: number) => {
    setVolumesList(volumesList.filter((v) => v.mgPerUnit !== mg));
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

    if (volumesList.length === 0) {
      showFeedback('error', currentLang === 'ru' ? 'Добавьте хотя бы один объём с ценой в тенге и долларах' : 'Add at least one volume with a KZT/USD price');
      return;
    }

    const nameVal = { ...locNames };
    // Make sure we have English name as fallback
    if (!nameVal.en && nameVal.ru) nameVal.en = nameVal.ru;
    if (!nameVal.ru && nameVal.en) nameVal.ru = nameVal.en;

    const parseList = (str: string) => {
      return str.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    };

    const mainImages = formData.images || [];
    const arImages = formData.imagesAr || [];

    const payload = {
      id: targetId,
      type: formData.type || 'peptide',
      unit: formData.unit || 'mg',
      name: nameVal,
      categoryId: formData.category || defaultCategoryId,
      description: locDescs,
      fullDescription: locFullDescs,
      // Each storefront keeps its own gallery and borrows the other's when empty, so the
      // placeholder is only needed when neither market has a photo at all.
      images: mainImages.length > 0 || arImages.length > 0 ? mainImages : [DEFAULT_PRODUCT_IMAGE],
      imagesAr: arImages,
      rating: Number(formData.rating || 5.0),
      volumes: volumesList,
      inStock: formData.inStock !== false,
      markets: formData.markets && formData.markets.length > 0 ? formData.markets : ['main'],
      // Clinical/dosing fields only mean something for peptides - omitted entirely for
      // additional goods rather than sent as empty placeholders.
      ...(isPeptideForm
        ? {
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
            form: formData.form || 'vial',
            mgPerUnit: Number(formData.mgPerUnit || 5),
            dosageRules: formData.dosageRules || { mgPerKgPerDay: 0.005, defaultDailyDoses: 1 },
          }
        : {}),
    };

    const url = isAdding ? '/api/medicines' : `/api/medicines/${targetId}`;
    const method = isAdding ? 'POST' : 'PUT';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders },
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

  // Fills every EN/AR field from the RU ones via AI in a single request, locking the form
  // while the request is in flight so the admin can't edit fields mid-translation.
  const handleTranslateProduct = () => {
    if (!locNames.ru.trim()) {
      showFeedback('error', currentLang === 'ru' ? 'Сначала заполните поля на русском' : 'Fill in the Russian fields first');
      return;
    }

    setIsTranslatingProduct(true);
    fetch('/api/admin/translate/medicine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        name: locNames.ru,
        description: locDescs.ru,
        fullDescription: locFullDescs.ru,
        usage: locUsages.ru,
        indications: locInds.ru,
        contraindications: locContras.ru,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Translation failed');
        return res.json();
      })
      .then((data) => {
        setLocNames((prev) => ({ ...prev, en: data.en?.name || prev.en, ar: data.ar?.name || prev.ar }));
        setLocDescs((prev) => ({ ...prev, en: data.en?.description || prev.en, ar: data.ar?.description || prev.ar }));
        setLocFullDescs((prev) => ({ ...prev, en: data.en?.fullDescription || prev.en, ar: data.ar?.fullDescription || prev.ar }));
        setLocUsages((prev) => ({ ...prev, en: data.en?.usage || prev.en, ar: data.ar?.usage || prev.ar }));
        setLocInds((prev) => ({ ...prev, en: data.en?.indications || prev.en, ar: data.ar?.indications || prev.ar }));
        setLocContras((prev) => ({ ...prev, en: data.en?.contraindications || prev.en, ar: data.ar?.contraindications || prev.ar }));
        showFeedback('success', currentLang === 'ru' ? 'Переведено!' : 'Translated!');
      })
      .catch((err) => {
        console.error(err);
        showFeedback('error', currentLang === 'ru' ? 'Не удалось перевести' : 'Could not translate');
      })
      .finally(() => {
        setIsTranslatingProduct(false);
      });
  };

  const handleSubmitCategory = (e: React.FormEvent) => {
    e.preventDefault();

    const targetId = isAddingCategory ? (categoryForm.id || '').trim().toLowerCase() : (categoryForm.id || '').trim();
    const name = { ...locCategoryNames };
    if (!name.en && name.ru) name.en = name.ru;
    if (!name.ru && name.en) name.ru = name.en;
    if (!name.ar) name.ar = name.en || name.ru;

    if (!targetId || !name.en) {
      showFeedback('error', currentLang === 'ru' ? 'Укажите ID и название категории (минимум на английском)' : 'Category id and name (at least English) are required');
      return;
    }

    const url = isAddingCategory ? '/api/categories' : `/api/categories/${targetId}`;
    const method = isAddingCategory ? 'POST' : 'PUT';

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        id: targetId,
        name,
        icon: categoryForm.icon || null,
        sortOrder: Number(categoryForm.sortOrder || 0),
        isActive: categoryForm.isActive !== false,
        markets: categoryForm.markets && categoryForm.markets.length > 0 ? categoryForm.markets : ['main'],
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Category save failed');
        return res.json();
      })
      .then(() => {
        showFeedback('success', isAddingCategory ? 'Category created!' : 'Category updated!');
        setIsAddingCategory(false);
        setIsEditingCategory(false);
        onRefreshCategories();
        onRefreshMedicines();
      })
      .catch((err) => {
        console.error(err);
        showFeedback('error', currentLang === 'ru' ? 'Не удалось сохранить категорию' : 'Could not save category');
      });
  };

  // Fills EN/AR from the RU name via AI, locking the form while the request is in flight
  const handleTranslateCategory = () => {
    const ru = locCategoryNames.ru.trim();
    if (!ru) {
      showFeedback('error', currentLang === 'ru' ? 'Сначала введите название на русском' : 'Enter the Russian name first');
      return;
    }

    setIsTranslatingCategory(true);
    fetch('/api/admin/translate/category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ name: ru }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Translation failed');
        return res.json();
      })
      .then((data) => {
        setLocCategoryNames((prev) => ({ ...prev, en: data.en || prev.en, ar: data.ar || prev.ar }));
        showFeedback('success', currentLang === 'ru' ? 'Переведено!' : 'Translated!');
      })
      .catch((err) => {
        console.error(err);
        showFeedback('error', currentLang === 'ru' ? 'Не удалось перевести' : 'Could not translate');
      })
      .finally(() => {
        setIsTranslatingCategory(false);
      });
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (!window.confirm(currentLang === 'ru' ? 'Удалить эту категорию?' : 'Delete this category?')) return;

    fetch(`/api/categories/${categoryId}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Category delete failed');
        return res.json();
      })
      .then(() => {
        showFeedback('success', currentLang === 'ru' ? 'Категория удалена' : 'Category deleted');
        onRefreshCategories();
      })
      .catch((err) => {
        console.error(err);
        showFeedback('error', currentLang === 'ru' ? 'Нельзя удалить категорию, если она используется товарами' : 'Category deletion failed');
      });
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newPromoCode.trim().toUpperCase();
    const percent = Number(newPromoPercent);

    if (!code) {
      showFeedback('error', currentLang === 'ru' ? 'Введите промокод' : 'Enter a promo code');
      return;
    }
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      showFeedback('error', currentLang === 'ru' ? 'Скидка должна быть от 0 до 100%' : 'Discount must be between 0 and 100%');
      return;
    }

    setPromoSaving(true);
    fetch('/api/admin/promo-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        code,
        partnerName: newPromoPartner.trim(),
        discountPercent: percent,
        maxUses: newPromoMaxUses.trim() || null,
        expiresAt: newPromoExpires || null,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          throw new Error(detail?.message || 'Promo code creation failed');
        }
        return res.json();
      })
      .then(() => {
        showFeedback('success', currentLang === 'ru' ? `Промокод ${code} создан` : `Promo code ${code} created`);
        setNewPromoCode('');
        setNewPromoPartner('');
        setNewPromoPercent('10');
        setNewPromoMaxUses('');
        setNewPromoExpires('');
        fetchPromoCodes();
      })
      .catch((err) => {
        console.error(err);
        showFeedback('error', err.message || (currentLang === 'ru' ? 'Не удалось создать промокод' : 'Could not create the promo code'));
      })
      .finally(() => {
        setPromoSaving(false);
      });
  };

  // Switching a code off keeps its history - past orders still count towards the partner's stats.
  const handleTogglePromo = (promo: PromoCodeStats) => {
    fetch(`/api/admin/promo-codes/${encodeURIComponent(promo.code)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ isActive: !promo.isActive }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Promo code update failed');
        return res.json();
      })
      .then(() => {
        fetchPromoCodes();
      })
      .catch((err) => {
        console.error(err);
        showFeedback('error', currentLang === 'ru' ? 'Не удалось изменить промокод' : 'Could not update the promo code');
      });
  };

  const handleDeletePromo = (code: string) => {
    const warning = currentLang === 'ru'
      ? `Удалить промокод ${code}? Он перестанет работать, но заказы, оформленные по нему, сохранятся.`
      : `Delete promo code ${code}? It stops working, but the orders placed with it are kept.`;
    if (!window.confirm(warning)) return;

    fetch(`/api/admin/promo-codes/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Promo code delete failed');
        return res.json();
      })
      .then(() => {
        showFeedback('success', currentLang === 'ru' ? 'Промокод удалён' : 'Promo code deleted');
        fetchPromoCodes();
      })
      .catch((err) => {
        console.error(err);
        showFeedback('error', currentLang === 'ru' ? 'Не удалось удалить промокод' : 'Could not delete the promo code');
      });
  };

  const handleCreateCountry = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCountryCode.trim().toUpperCase();
    const nameRu = newCountryNames.ru.trim();

    if (!/^[A-Z]{2}$/.test(code)) {
      showFeedback('error', currentLang === 'ru' ? 'Код страны — две латинские буквы, например KZ' : 'Country code must be two latin letters, e.g. KZ');
      return;
    }
    if (!nameRu && !newCountryNames.en.trim()) {
      showFeedback('error', currentLang === 'ru' ? 'Введите название страны' : 'Enter the country name');
      return;
    }

    setDeliverySaving(true);
    fetch('/api/admin/delivery-countries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        code,
        name: newCountryNames,
        priceKzt: Number(newCountryPriceKzt) || 0,
        priceUsd: Number(newCountryPriceUsd) || 0,
        priceSar: Number(newCountryPriceSar) || 0,
        markets: newCountryMarkets.length > 0 ? newCountryMarkets : ['main'],
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const detail = await res.json().catch(() => null);
          throw new Error(detail?.message || 'Country creation failed');
        }
        return res.json();
      })
      .then(() => {
        showFeedback('success', currentLang === 'ru' ? `Страна ${code} добавлена` : `Country ${code} added`);
        setNewCountryCode('');
        setNewCountryNames({ ru: '', en: '', ar: '' });
        setNewCountryPriceKzt('');
        setNewCountryPriceUsd('');
        setNewCountryPriceSar('');
        fetchDeliveryCountries();
      })
      .catch((err) => {
        console.error(err);
        showFeedback('error', err.message || (currentLang === 'ru' ? 'Не удалось добавить страну' : 'Could not add the country'));
      })
      .finally(() => {
        setDeliverySaving(false);
      });
  };

  const patchCountry = (code: string, body: Record<string, unknown>) => {
    fetch(`/api/admin/delivery-countries/${encodeURIComponent(code)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Country update failed');
        return res.json();
      })
      .then(() => {
        setEditingCountry(null);
        fetchDeliveryCountries();
      })
      .catch((err) => {
        console.error(err);
        showFeedback('error', currentLang === 'ru' ? 'Не удалось изменить страну' : 'Could not update the country');
      });
  };

  const handleSaveCountryPrices = (code: string) => {
    patchCountry(code, {
      priceKzt: Number(editCountryPrices.kzt) || 0,
      priceUsd: Number(editCountryPrices.usd) || 0,
      priceSar: Number(editCountryPrices.sar) || 0,
    });
  };

  const handleDeleteCountry = (code: string) => {
    const warning = currentLang === 'ru'
      ? `Удалить страну ${code}? Она исчезнет из выбора при оформлении, но прошлые заказы останутся.`
      : `Delete country ${code}? It disappears from checkout, but past orders are kept.`;
    if (!window.confirm(warning)) return;

    fetch(`/api/admin/delivery-countries/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Country delete failed');
        return res.json();
      })
      .then(() => {
        showFeedback('success', currentLang === 'ru' ? 'Страна удалена' : 'Country deleted');
        fetchDeliveryCountries();
      })
      .catch((err) => {
        console.error(err);
        showFeedback('error', currentLang === 'ru' ? 'Не удалось удалить страну' : 'Could not delete the country');
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

  const filteredCategories = categories.filter((category) => {
    const q = categorySearch.toLowerCase();
    return category.id.toLowerCase().includes(q) || Object.values(category.name).some((val) => val.toLowerCase().includes(q));
  });

  // KPI Calculations
  const stats = {
    totalRevenue: orders.reduce((sum, o) => sum + o.totalPrice, 0),
    totalRevenueUsd: orders.reduce((sum, o) => sum + (o.totalPriceUsd || 0), 0),
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
            <span className="px-3 py-1 text-[10px] font-bold tracking-wider text-nadeck-400 bg-nadeck-500/10 border border-nadeck-500/25 rounded-full uppercase">
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
            className="px-4 py-2.5 bg-nadeck-500 hover:bg-nadeck-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-nadeck-500/10 active:scale-95 transition-all self-stretch sm:self-auto justify-center"
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
              <span className="block text-[10px] font-bold text-slate-400">${stats.totalRevenueUsd.toLocaleString()}</span>
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
            <div className="w-10 h-10 bg-nadeck-50 rounded-xl flex items-center justify-center text-nadeck-600">
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
          onClick={() => { setActiveSubTab('products'); setIsEditing(false); setIsAdding(false); setIsEditingCategory(false); setIsAddingCategory(false); }}
          className={`px-5 py-3 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap leading-none border-b-2 ${
            activeSubTab === 'products' && !isEditing && !isAdding
              ? 'border-nadeck-600 text-nadeck-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{currentLang === 'ru' ? 'Склад товаров' : 'Peptides Catalog'}</span>
        </button>
        <button
          id="admin-tab-categories"
          onClick={() => { setActiveSubTab('categories'); setIsEditing(false); setIsAdding(false); setIsEditingCategory(false); setIsAddingCategory(false); }}
          className={`px-5 py-3 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap leading-none border-b-2 ${
            activeSubTab === 'categories' && !isEditingCategory && !isAddingCategory
              ? 'border-nadeck-600 text-nadeck-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{currentLang === 'ru' ? 'Категории' : 'Categories'}</span>
        </button>
        <button
          id="admin-tab-orders"
          onClick={() => { setActiveSubTab('orders'); setIsEditing(false); setIsAdding(false); setIsEditingCategory(false); setIsAddingCategory(false); }}
          className={`px-5 py-3 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap leading-none border-b-2 ${
            activeSubTab === 'orders' && !isEditing && !isAdding
              ? 'border-nadeck-600 text-nadeck-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{currentLang === 'ru' ? 'Заказы клиентов' : 'Customer Orders'}</span>
        </button>
        <button
          id="admin-tab-promo"
          onClick={() => { setActiveSubTab('promo'); setIsEditing(false); setIsAdding(false); setIsEditingCategory(false); setIsAddingCategory(false); }}
          className={`px-5 py-3 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap leading-none border-b-2 ${
            activeSubTab === 'promo' && !isEditing && !isAdding
              ? 'border-nadeck-600 text-nadeck-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>{currentLang === 'ru' ? 'Промокоды' : 'Promo Codes'}</span>
        </button>
        <button
          id="admin-tab-delivery"
          onClick={() => { setActiveSubTab('delivery'); setIsEditing(false); setIsAdding(false); setIsEditingCategory(false); setIsAddingCategory(false); }}
          className={`px-5 py-3 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap leading-none border-b-2 ${
            activeSubTab === 'delivery' && !isEditing && !isAdding
              ? 'border-nadeck-600 text-nadeck-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{currentLang === 'ru' ? 'Доставка' : 'Delivery'}</span>
        </button>
        {(isEditing || isAdding || isEditingCategory || isAddingCategory) && (
          <div className="px-5 py-3 text-xs sm:text-sm font-bold text-nadeck-600 border-b-2 border-nadeck-600 flex items-center gap-1">
            <Edit2 className="w-4 h-4 animate-bounce" />
            <span>{(isAdding || isAddingCategory) ? (currentLang === 'ru' ? 'Новый элемент' : 'Create Item') : (currentLang === 'ru' ? 'Редактирование' : 'Editing Item')}</span>
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
                className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm bg-white rounded-2xl border border-slate-200/60 focus:border-nadeck-500 focus:outline-none focus:ring-1 focus:ring-nadeck-500 transition-all duration-200"
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
                        <th className="py-4 px-4">{currentLang === 'ru' ? 'Фасовка' : 'Formulation'}</th>
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
                                src={med.images?.[0] || med.imagesAr?.[0]}
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

                          {/* Col 2 Category - a product carries one category per storefront, so a
                              market-scoped admin is shown the one their own site files it under
                              (falling back to the nadeck.net category, exactly as the site does). */}
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap items-center gap-1">
                              {(adminMarket === 'ar' ? [med.categoryAr || med.category] : [med.category, ...(adminMarket ? [] : [med.categoryAr])])
                                .filter((categoryId): categoryId is string => Boolean(categoryId))
                                .map((categoryId) => (
                              <span key={categoryId} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {categoryLabelById[categoryId] || categoryId}
                              </span>
                              ))}
                              {(med.markets && med.markets.length > 0 ? med.markets : ['main']).map((market) => (
                                <span
                                  key={market}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                                >
                                  {market === 'main' ? '🇷🇺 nadeck.net' : '🇸🇦 ar.nadeck.net'}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Col 3 Info tag */}
                          <td className="py-4 px-4 text-xs">
                            <p className="text-[10px] text-slate-400 font-bold capitalize">
                              {med.type === 'peptide'
                                ? `${med.form} • ${med.mgPerUnit} mg`
                                : (currentLang === 'ru' ? 'Доп. товар' : 'Additional good')}
                            </p>
                          </td>

                          {/* Col 4 Stock switcher ("что продана что нет") */}
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

                          {/* Col 5 Buttons */}
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
                                onClick={() => handleDeleteProduct(med.id, med.name.en)}
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

        {/* CATEGORY MANAGEMENT TAB */}
        {activeSubTab === 'categories' && !isEditing && !isAdding && !isEditingCategory && !isAddingCategory && (
          <div className="space-y-4" id="view-admin-categories">
            <div className="relative flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  id="admin-category-search"
                  type="text"
                  placeholder={currentLang === 'ru' ? 'Поиск категории по ID или названию...' : 'Filter categories by id or name...'}
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm bg-white rounded-2xl border border-slate-200/60 focus:border-nadeck-500 focus:outline-none focus:ring-1 focus:ring-nadeck-500 transition-all duration-200"
                />
              </div>
              <button
                id="admin-category-add"
                type="button"
                onClick={startAddCategory}
                className="px-4 py-3 rounded-2xl bg-nadeck-600 hover:bg-nadeck-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{currentLang === 'ru' ? 'Добавить категорию' : 'Add Category'}</span>
              </button>
            </div>

            {filteredCategories.length > 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[9.5px] font-black">
                        <th className="py-4 px-5">ID</th>
                        <th className="py-4 px-4">{currentLang === 'ru' ? 'Название' : 'Name'}</th>
                        <th className="py-4 px-4">{currentLang === 'ru' ? 'Порядок' : 'Order'}</th>
                        <th className="py-4 px-4 text-center">{currentLang === 'ru' ? 'Статус' : 'Status'}</th>
                        <th className="py-4 px-5 text-right">{currentLang === 'ru' ? 'Опции' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70 text-slate-700">
                      {filteredCategories.map((category) => (
                        <tr key={category.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-4 px-5 font-mono text-xs font-bold text-slate-900">{category.id}</td>
                          <td className="py-4 px-4 text-sm font-semibold text-slate-800">
                            <div className="flex items-center gap-2.5">
                              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 shrink-0 overflow-hidden">
                                <img src={category.icon || defaultCategoryIcon} alt="" className="w-4.5 h-4.5 object-contain" />
                              </span>
                              <div className="flex flex-col gap-1">
                                <span>{category.name[currentLang] || category.name.en}</span>
                                <div className="flex flex-wrap gap-1">
                                  {(category.markets && category.markets.length > 0 ? category.markets : ['main']).map((market) => (
                                    <span
                                      key={market}
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                                    >
                                      {market === 'main' ? 'nadeck.net' : 'ar.nadeck.net'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-600">{category.sortOrder}</td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${category.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                              {category.isActive ? (currentLang === 'ru' ? 'Активна' : 'Active') : (currentLang === 'ru' ? 'Скрыта' : 'Hidden')}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => startEditCategory(category)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-slate-600 transition-colors"
                                title={currentLang === 'ru' ? 'Редактировать' : 'Edit'}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(category.id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors"
                                title={currentLang === 'ru' ? 'Удалить' : 'Delete'}
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
              <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <AlertTriangle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">{currentLang === 'ru' ? 'Категории не найдены' : 'No categories found'}</h3>
              </div>
            )}
          </div>
        )}

        {/* ADD OR EDIT CATEGORY FORM VIEW COMPONENT */}
        {(isAddingCategory || isEditingCategory) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs"
            id="admin-category-form-shell"
          >
            {isTranslatingCategory && (
              <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center gap-2" id="category-translate-overlay">
                <Loader2 className="w-6 h-6 text-nadeck-600 animate-spin" />
                <span className="text-xs font-bold text-slate-600">{currentLang === 'ru' ? 'ИИ переводит...' : 'AI is translating...'}</span>
              </div>
            )}
            <form onSubmit={handleSubmitCategory} className="space-y-5" id="admin-category-form">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {isAddingCategory ? (currentLang === 'ru' ? 'Создание категории' : 'Create Category') : (currentLang === 'ru' ? 'Редактирование категории' : 'Edit Category')}
                  </h3>
                  <p className="text-xs text-slate-400">{currentLang === 'ru' ? 'ID используется в товарах, название показывается в каталоге.' : 'The id is used in products, the name is shown in catalog labels.'}</p>
                </div>
                <button
                  type="button"
                  disabled={isTranslatingCategory}
                  onClick={() => { setIsAddingCategory(false); setIsEditingCategory(false); }}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <fieldset disabled={isTranslatingCategory} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    {currentLang === 'ru' ? 'ID категории' : 'Category ID'} *
                  </label>
                  <input
                    type="text"
                    disabled={!isAddingCategory}
                    placeholder="e.g. accessories"
                    value={categoryForm.id || ''}
                    onChange={(e) => setCategoryForm({ ...categoryForm, id: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-nadeck-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between gap-2 text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    <span>🇷🇺 {currentLang === 'ru' ? 'Название (RU)' : 'Name (RU)'}</span>
                    <button
                      type="button"
                      id="category-translate-btn"
                      onClick={handleTranslateCategory}
                      title={currentLang === 'ru' ? 'Перевести через ИИ' : 'Translate with AI'}
                      className="normal-case font-bold text-[10px] text-nadeck-600 hover:text-nadeck-700 flex items-center gap-1"
                    >
                      <Languages className="w-3.5 h-3.5" />
                      {currentLang === 'ru' ? 'Перевести ИИ' : 'AI translate'}
                    </button>
                  </label>
                  <input
                    type="text"
                    placeholder="Напр. Дополнительные товары"
                    value={locCategoryNames.ru}
                    onChange={(e) => setLocCategoryNames({ ...locCategoryNames, ru: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-nadeck-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    🇺🇸 {currentLang === 'ru' ? 'Название (EN)' : 'Name (EN)'} *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Additional Goods"
                    value={locCategoryNames.en}
                    onChange={(e) => setLocCategoryNames({ ...locCategoryNames, en: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-nadeck-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    🇸🇦 {currentLang === 'ru' ? 'Название (AR)' : 'Name (AR)'}
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    placeholder="مثال: منتجات إضافية"
                    value={locCategoryNames.ar}
                    onChange={(e) => setLocCategoryNames({ ...locCategoryNames, ar: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-nadeck-500 focus:outline-none text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    {currentLang === 'ru' ? 'Порядок' : 'Sort Order'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={categoryForm.sortOrder ?? 0}
                    onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-nadeck-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 w-full">
                    <input
                      type="checkbox"
                      checked={categoryForm.isActive !== false}
                      onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                    />
                    <span>{currentLang === 'ru' ? 'Категория активна' : 'Category is active'}</span>
                  </label>
                </div>
              </div>

              {/* Which storefront(s) list this category - same idea as the product form's
                  market box. A scoped admin can't change this (the backend pins it), so they
                  get a locked readout instead of checkboxes. */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 space-y-2.5" id="category-form-markets-box">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  {currentLang === 'ru' ? 'Показывать на сайтах' : 'Visible on'}
                </span>
                {adminMarket ? (
                  <p className="text-xs font-semibold text-slate-500">
                    {adminMarket === 'ar' ? 'ar.nadeck.net' : 'nadeck.net'}
                    {' '}
                    <span className="font-normal text-slate-400">
                      {currentLang === 'ru' ? '(закреплено за вашей учётной записью)' : '(fixed for your account)'}
                    </span>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {(['main', 'ar'] as const).map((market) => {
                      const active = (categoryForm.markets && categoryForm.markets.length > 0 ? categoryForm.markets : ['main']).includes(market);
                      return (
                        <label key={market} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => {
                              const current = categoryForm.markets && categoryForm.markets.length > 0 ? categoryForm.markets : ['main'];
                              const next = active ? current.filter((m) => m !== market) : [...current, market];
                              setCategoryForm({ ...categoryForm, markets: next });
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-nadeck-600 focus:ring-nadeck-500"
                          />
                          {market === 'main' ? 'nadeck.net' : 'ar.nadeck.net'}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                  {currentLang === 'ru' ? 'Иконка категории' : 'Category icon'}
                </label>
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-14 h-14 rounded-2xl border border-slate-200 bg-slate-50 shrink-0 overflow-hidden">
                    {isUploadingCategoryIcon ? (
                      <Loader2 className="w-5 h-5 text-nadeck-600 animate-spin" />
                    ) : (
                      <img src={categoryForm.icon || defaultCategoryIcon} alt="" className="w-9 h-9 object-contain" />
                    )}
                  </span>
                  <label
                    htmlFor="category-icon-upload"
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors ${
                      isUploadingCategoryIcon ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {currentLang === 'ru' ? 'Загрузить иконку' : 'Upload icon'}
                  </label>
                  <button
                    type="button"
                    id="btn-category-icon-library"
                    onClick={() => setMediaLibraryTarget('category-icon')}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <Images className="w-3.5 h-3.5" />
                    {currentLang === 'ru' ? 'Из хранилища' : 'From storage'}
                  </button>
                  <input
                    id="category-icon-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingCategoryIcon}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      setIsUploadingCategoryIcon(true);
                      uploadImage(file, 'categories')
                        .then((url) => setCategoryForm((prev) => ({ ...prev, icon: url })))
                        .catch((err) => showFeedback('error', err.message || (currentLang === 'ru' ? 'Не удалось загрузить иконку' : 'Could not upload icon')))
                        .finally(() => setIsUploadingCategoryIcon(false));
                    }}
                  />
                  {categoryForm.icon && (
                    <button
                      type="button"
                      id="category-icon-remove"
                      onClick={() => setCategoryForm({ ...categoryForm, icon: null })}
                      title={currentLang === 'ru' ? 'Сбросить (использовать логотип по умолчанию)' : 'Reset (use the default logo)'}
                      className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  {currentLang === 'ru'
                    ? 'PNG/SVG/WEBP до 5 МБ. Если не загрузить — используется логотип Nadeck красного цвета.'
                    : 'PNG/SVG/WEBP up to 5MB. If left empty, the red Nadeck logo mark is used by default.'}
                </p>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-nadeck-600 hover:bg-nadeck-700 text-white text-xs sm:text-sm font-bold">
                  {currentLang === 'ru' ? 'Сохранить' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAddingCategory(false); setIsEditingCategory(false); }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold"
                >
                  {currentLang === 'ru' ? 'Отмена' : 'Cancel'}
                </button>
              </div>
              </fieldset>
            </form>
          </motion.div>
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
                className="w-full pl-11 pr-4 py-3 text-xs sm:text-sm bg-white rounded-2xl border border-slate-200/60 focus:border-nadeck-500 focus:outline-none transition-all duration-200"
              />
            </div>

            {/* List of customer orders */}
            {ordersLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs font-semibold" id="orders-loading-state">
                <div className="w-8 h-8 rounded-full border-2 border-nadeck-600 border-t-transparent animate-spin mx-auto mb-3" />
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
                          <span className="text-xs font-bold text-nadeck-800 bg-nadeck-50 px-2.5 py-0.5 rounded-lg border border-nadeck-100/50">
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
                                <span className="text-nadeck-600 font-black ml-1">x{item.quantity}</span>
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
                            {order.address.country ? `${order.address.country}, ` : ''}{order.address.city}, {order.address.street}, кв./офис {order.address.apartment} {order.address.postalCode && `• Инд. ${order.address.postalCode}`}
                          </p>
                        </div>
                      </div>

                      {/* Right Hand: Pricing and Status Modifier controls */}
                      <div className="w-full lg:w-auto flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        {/* Order total */}
                        <div className="text-right">
                          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentLang === 'ru' ? 'ИТОГО К ОПЛАТЕ' : 'ORDER GRAND TOTAL'}</span>
                          <span className="text-base sm:text-lg font-black text-slate-900">{order.totalPrice.toLocaleString()} ₸</span>
                          <span className="block text-[10px] font-bold text-slate-400">${(order.totalPriceUsd || 0).toLocaleString()}</span>
                          <span className="block text-[9px] text-nadeck-600 font-bold uppercase mt-0.5">{order.paymentMethod}</span>
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

        {activeSubTab === 'promo' && !isEditing && !isAdding && (
          <div className="space-y-5" id="view-admin-promo">
            {/* Create a code to hand to a partner */}
            <form onSubmit={handleCreatePromo} className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-xs space-y-4" id="promo-create-form">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-nadeck-600" />
                {currentLang === 'ru' ? 'Новый промокод для партнёра' : 'New partner promo code'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{currentLang === 'ru' ? 'Промокод' : 'Code'} *</label>
                  <input
                    id="promo-new-code"
                    type="text"
                    value={newPromoCode}
                    onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                    placeholder="PARTNER10"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 uppercase tracking-wider font-extrabold focus:outline-none focus:border-nadeck-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{currentLang === 'ru' ? 'Партнёр' : 'Partner'}</label>
                  <input
                    id="promo-new-partner"
                    type="text"
                    value={newPromoPartner}
                    onChange={(e) => setNewPromoPartner(e.target.value)}
                    placeholder={currentLang === 'ru' ? 'Имя или блог' : 'Name or blog'}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-nadeck-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{currentLang === 'ru' ? 'Скидка, %' : 'Discount, %'} *</label>
                  <input
                    id="promo-new-percent"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={newPromoPercent}
                    onChange={(e) => setNewPromoPercent(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 font-extrabold focus:outline-none focus:border-nadeck-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{currentLang === 'ru' ? 'Лимит заказов' : 'Usage limit'}</label>
                  <input
                    id="promo-new-max-uses"
                    type="number"
                    min="1"
                    step="1"
                    value={newPromoMaxUses}
                    onChange={(e) => setNewPromoMaxUses(e.target.value)}
                    placeholder={currentLang === 'ru' ? 'без лимита' : 'unlimited'}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-nadeck-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{currentLang === 'ru' ? 'Действует до' : 'Expires'}</label>
                  <input
                    id="promo-new-expires"
                    type="date"
                    value={newPromoExpires}
                    onChange={(e) => setNewPromoExpires(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-nadeck-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[11px] text-slate-400 font-medium">
                  {currentLang === 'ru'
                    ? 'Скидка вычитается из стоимости товаров, доставка не удешевляется.'
                    : 'The discount comes off the goods subtotal; delivery is never discounted.'}
                </p>
                <button
                  id="promo-create-btn"
                  type="submit"
                  disabled={promoSaving}
                  className="px-5 py-2.5 bg-nadeck-600 hover:bg-nadeck-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                >
                  {promoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{currentLang === 'ru' ? 'Создать промокод' : 'Create promo code'}</span>
                </button>
              </div>
            </form>

            {/* Stats table: which partner brought how many customers */}
            {promoLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs font-semibold" id="promo-loading-state">
                <div className="w-8 h-8 rounded-full border-2 border-nadeck-600 border-t-transparent animate-spin mx-auto mb-3" />
                {currentLang === 'ru' ? 'Загрузка промокодов...' : 'Loading promo codes...'}
              </div>
            ) : promoCodes.length > 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs" id="admin-promo-table-box">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" id="admin-promo-table">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[9.5px] font-black">
                        <th className="py-4 px-5">{currentLang === 'ru' ? 'Промокод' : 'Code'}</th>
                        <th className="py-4 px-4">{currentLang === 'ru' ? 'Партнёр' : 'Partner'}</th>
                        <th className="py-4 px-4 text-center">{currentLang === 'ru' ? 'Скидка' : 'Discount'}</th>
                        <th className="py-4 px-4 text-center">{currentLang === 'ru' ? 'Клиентов' : 'Customers'}</th>
                        <th className="py-4 px-4 text-center">{currentLang === 'ru' ? 'Заказов' : 'Orders'}</th>
                        <th className="py-4 px-4 text-right">{currentLang === 'ru' ? 'Выручка' : 'Revenue'}</th>
                        <th className="py-4 px-4 text-center">{currentLang === 'ru' ? 'Статус' : 'Status'}</th>
                        <th className="py-4 px-5 text-right">{currentLang === 'ru' ? 'Опции' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70 text-slate-700">
                      {promoCodes.map((promo) => (
                        <tr key={promo.code} className="hover:bg-slate-50/40 transition-colors" id={`admin-promo-row-${promo.code}`}>
                          <td className="py-4 px-5">
                            <span className="text-xs font-black text-slate-900 font-mono px-2.5 py-1 bg-slate-100 rounded-lg">{promo.code}</span>
                            {promo.expiresAt && (
                              <span className="block text-[10px] text-slate-400 font-semibold mt-1">
                                {currentLang === 'ru' ? 'до' : 'until'} {new Date(promo.expiresAt).toLocaleDateString()}
                              </span>
                            )}
                            {promo.maxUses !== null && (
                              <span className="block text-[10px] text-slate-400 font-semibold">
                                {currentLang === 'ru' ? 'лимит' : 'limit'} {promo.ordersCount}/{promo.maxUses}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-xs font-semibold text-slate-700">
                            {promo.partnerName || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="py-4 px-4 text-center text-xs font-black text-nadeck-600">−{promo.discountPercent}%</td>
                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex items-center gap-1.5 text-sm font-black text-slate-900">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              {promo.customersCount}
                            </span>
                            {promo.guestOrders > 0 && (
                              <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">
                                {currentLang === 'ru' ? `из них гостей: ${promo.guestOrders}` : `guests: ${promo.guestOrders}`}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center text-xs font-extrabold text-slate-800">{promo.ordersCount}</td>
                          <td className="py-4 px-4 text-right">
                            <span className="text-xs font-extrabold text-slate-900">{Math.round(promo.revenueKzt).toLocaleString()} ₸</span>
                            <span className="block text-[10px] text-slate-400 font-bold">
                              {currentLang === 'ru' ? 'скидок' : 'discounted'} {Math.round(promo.discountGivenKzt).toLocaleString()} ₸
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
                              promo.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {promo.isActive
                                ? (currentLang === 'ru' ? 'Активен' : 'Active')
                                : (currentLang === 'ru' ? 'Выключен' : 'Disabled')}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                id={`promo-toggle-${promo.code}`}
                                onClick={() => handleTogglePromo(promo)}
                                title={promo.isActive ? (currentLang === 'ru' ? 'Выключить' : 'Disable') : (currentLang === 'ru' ? 'Включить' : 'Enable')}
                                className={`p-2 rounded-xl transition ${
                                  promo.isActive
                                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                }`}
                              >
                                <Power className="w-4 h-4" />
                              </button>
                              <button
                                id={`promo-delete-${promo.code}`}
                                onClick={() => handleDeletePromo(promo.code)}
                                title={currentLang === 'ru' ? 'Удалить' : 'Delete'}
                                className="p-2 bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-500 hover:text-rose-700 transition"
                              >
                                <Trash2 className="w-4 h-4" />
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
              <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200" id="admin-empty-promo">
                <Ticket className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">
                  {currentLang === 'ru' ? 'Промокодов пока нет' : 'No promo codes yet'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {currentLang === 'ru'
                    ? 'Создайте код выше и передайте его партнёру — здесь будет видно, сколько клиентов он привёл.'
                    : 'Create a code above and hand it to a partner - this table will show how many customers it brought.'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'delivery' && !isEditing && !isAdding && (
          <div className="space-y-5" id="view-admin-delivery">
            {/* Add a destination */}
            <form onSubmit={handleCreateCountry} className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-xs space-y-4" id="delivery-create-form">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-nadeck-600" />
                {currentLang === 'ru' ? 'Новая страна доставки' : 'New delivery country'}
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{currentLang === 'ru' ? 'Код' : 'Code'} *</label>
                  <input
                    id="country-new-code"
                    type="text"
                    maxLength={2}
                    value={newCountryCode}
                    onChange={(e) => setNewCountryCode(e.target.value.toUpperCase())}
                    placeholder="KZ"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 uppercase font-extrabold text-center focus:outline-none focus:border-nadeck-500 focus:bg-white"
                  />
                </div>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <div key={lang.code} className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {currentLang === 'ru' ? 'Название' : 'Name'} {lang.code.toUpperCase()}{lang.code === 'ru' ? ' *' : ''}
                    </label>
                    <input
                      id={`country-new-name-${lang.code}`}
                      type="text"
                      value={newCountryNames[lang.code]}
                      onChange={(e) => setNewCountryNames({ ...newCountryNames, [lang.code]: e.target.value })}
                      placeholder={lang.code === 'ru' ? 'Казахстан' : lang.code === 'en' ? 'Kazakhstan' : 'كازاخستان'}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-nadeck-500 focus:bg-white"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{currentLang === 'ru' ? 'Доставка, ₸' : 'Delivery, ₸'}</label>
                  <input
                    id="country-new-price-kzt"
                    type="number"
                    min="0"
                    value={newCountryPriceKzt}
                    onChange={(e) => setNewCountryPriceKzt(e.target.value)}
                    placeholder="1500"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-nadeck-500 focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{currentLang === 'ru' ? 'Доставка, $' : 'Delivery, $'}</label>
                  <input
                    id="country-new-price-usd"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newCountryPriceUsd}
                    onChange={(e) => setNewCountryPriceUsd(e.target.value)}
                    placeholder="5"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-nadeck-500 focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{currentLang === 'ru' ? 'Доставка, ﷼' : 'Delivery, ﷼'}</label>
                  <input
                    id="country-new-price-sar"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newCountryPriceSar}
                    onChange={(e) => setNewCountryPriceSar(e.target.value)}
                    placeholder="50"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-nadeck-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 space-y-2.5" id="country-form-markets-box">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  {currentLang === 'ru' ? 'Предлагать на сайтах' : 'Offered on'}
                </span>
                {adminMarket ? (
                  <p className="text-xs font-semibold text-slate-500">
                    {adminMarket === 'ar' ? 'ar.nadeck.net' : 'nadeck.net'}{' '}
                    <span className="font-normal text-slate-400">
                      {currentLang === 'ru' ? '(закреплено за вашей учётной записью)' : '(fixed for your account)'}
                    </span>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {(['main', 'ar'] as const).map((market) => {
                      const active = newCountryMarkets.includes(market);
                      return (
                        <label key={market} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => {
                              setNewCountryMarkets(active ? newCountryMarkets.filter((m) => m !== market) : [...newCountryMarkets, market]);
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-nadeck-600 focus:ring-nadeck-500"
                          />
                          {market === 'main' ? 'nadeck.net' : 'ar.nadeck.net'}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[11px] text-slate-400 font-medium">
                  {currentLang === 'ru'
                    ? 'Цена берётся в валюте, в которой покупатель видит сайт (₸ — русский, $ — английский, ﷼ — арабский). Бесплатной доставки нет: 0 означает «уточняется менеджером».'
                    : 'The fee is charged in the currency the shopper sees (₸ Russian, $ English, ﷼ Arabic). There is no free tier: 0 reads as "confirmed by manager".'}
                </p>
                <button
                  id="country-create-btn"
                  type="submit"
                  disabled={deliverySaving}
                  className="px-5 py-2.5 bg-nadeck-600 hover:bg-nadeck-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                >
                  {deliverySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{currentLang === 'ru' ? 'Добавить страну' : 'Add country'}</span>
                </button>
              </div>
            </form>

            {deliveryLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs font-semibold" id="delivery-loading-state">
                <div className="w-8 h-8 rounded-full border-2 border-nadeck-600 border-t-transparent animate-spin mx-auto mb-3" />
                {currentLang === 'ru' ? 'Загрузка стран...' : 'Loading countries...'}
              </div>
            ) : deliveryCountries.length > 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs" id="admin-delivery-table-box">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" id="admin-delivery-table">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[9.5px] font-black">
                        <th className="py-4 px-5">{currentLang === 'ru' ? 'Страна' : 'Country'}</th>
                        <th className="py-4 px-4 text-center">₸</th>
                        <th className="py-4 px-4 text-center">$</th>
                        <th className="py-4 px-4 text-center">﷼</th>
                        <th className="py-4 px-4">{currentLang === 'ru' ? 'Сайты' : 'Sites'}</th>
                        <th className="py-4 px-4 text-center">{currentLang === 'ru' ? 'Статус' : 'Status'}</th>
                        <th className="py-4 px-5 text-right">{currentLang === 'ru' ? 'Опции' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70 text-slate-700">
                      {deliveryCountries.map((country) => {
                        const isEditingRow = editingCountry === country.code;
                        return (
                          <tr key={country.code} className="hover:bg-slate-50/40 transition-colors" id={`admin-country-row-${country.code}`}>
                            <td className="py-4 px-5">
                              <span className="text-xs font-black text-slate-900">{country.name[currentLang] || country.name.en || country.code}</span>
                              <span className="block text-[10px] text-slate-400 font-mono font-bold mt-0.5">{country.code}</span>
                            </td>
                            {(['kzt', 'usd', 'sar'] as const).map((currency) => (
                              <td key={currency} className="py-4 px-4 text-center">
                                {isEditingRow ? (
                                  <input
                                    id={`country-edit-${currency}-${country.code}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editCountryPrices[currency]}
                                    onChange={(e) => setEditCountryPrices({ ...editCountryPrices, [currency]: e.target.value })}
                                    className="w-20 px-2 py-1.5 text-xs bg-white rounded-lg border border-nadeck-300 font-bold text-center focus:outline-none focus:border-nadeck-500"
                                  />
                                ) : (
                                  <span className="text-xs font-extrabold text-slate-800">
                                    {(currency === 'kzt' ? country.priceKzt : currency === 'usd' ? country.priceUsd : country.priceSar).toLocaleString()}
                                  </span>
                                )}
                              </td>
                            ))}
                            <td className="py-4 px-4">
                              <div className="flex flex-wrap gap-1">
                                {(country.markets && country.markets.length > 0 ? country.markets : ['main']).map((market) => (
                                  <span key={market} className="text-[9px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                    {market === 'main' ? 'nadeck.net' : 'ar.nadeck.net'}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
                                country.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {country.isActive
                                  ? (currentLang === 'ru' ? 'Активна' : 'Active')
                                  : (currentLang === 'ru' ? 'Выключена' : 'Disabled')}
                              </span>
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex items-center justify-end gap-2">
                                {isEditingRow ? (
                                  <>
                                    <button
                                      id={`country-save-${country.code}`}
                                      onClick={() => handleSaveCountryPrices(country.code)}
                                      title={currentLang === 'ru' ? 'Сохранить' : 'Save'}
                                      className="p-2 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-emerald-600 transition"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      id={`country-cancel-${country.code}`}
                                      onClick={() => setEditingCountry(null)}
                                      title={currentLang === 'ru' ? 'Отмена' : 'Cancel'}
                                      className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    id={`country-edit-${country.code}`}
                                    onClick={() => {
                                      setEditingCountry(country.code);
                                      setEditCountryPrices({
                                        kzt: String(country.priceKzt),
                                        usd: String(country.priceUsd),
                                        sar: String(country.priceSar),
                                      });
                                    }}
                                    title={currentLang === 'ru' ? 'Изменить цены' : 'Edit prices'}
                                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  id={`country-toggle-${country.code}`}
                                  onClick={() => patchCountry(country.code, { isActive: !country.isActive })}
                                  title={country.isActive ? (currentLang === 'ru' ? 'Выключить' : 'Disable') : (currentLang === 'ru' ? 'Включить' : 'Enable')}
                                  className={`p-2 rounded-xl transition ${
                                    country.isActive
                                      ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                  }`}
                                >
                                  <Power className="w-4 h-4" />
                                </button>
                                <button
                                  id={`country-delete-${country.code}`}
                                  onClick={() => handleDeleteCountry(country.code)}
                                  title={currentLang === 'ru' ? 'Удалить' : 'Delete'}
                                  className="p-2 bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-500 hover:text-rose-700 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200" id="admin-empty-delivery">
                <Truck className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">
                  {currentLang === 'ru' ? 'Стран доставки пока нет' : 'No delivery countries yet'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {currentLang === 'ru'
                    ? 'Пока список пуст, в корзине не спрашивают страну и действует старая ставка 1500 ₸ / $5 / 50 ﷼.'
                    : 'While the list is empty the cart asks for no country and charges the old flat 1500 ₸ / $5 / 50 ﷼ rate.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ADD OR EDIT PRODUCT FORM VIEW COMPONENT */}
        {(isEditing || isAdding) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-xs"
            id="admin-form-shell"
          >
            {isTranslatingProduct && (
              <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center gap-2" id="product-translate-overlay">
                <Loader2 className="w-6 h-6 text-nadeck-600 animate-spin" />
                <span className="text-xs font-bold text-slate-600">{currentLang === 'ru' ? 'ИИ переводит...' : 'AI is translating...'}</span>
              </div>
            )}
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
                  disabled={isTranslatingProduct}
                  onClick={() => { setIsAdding(false); setIsEditing(false); }}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <fieldset disabled={isTranslatingProduct} className="space-y-6">

              {/* Grid 1 Block: Basic identifiers. Pricing lives only in the volumes manager
                  below - price is tied to a specific mg strength, so a separate top-level
                  price field would just invite the KZT/USD figures to fall out of sync with
                  the actual volume being sold. */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
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
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-nadeck-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 font-mono"
                  />
                  {isAdding && <span className="text-[10px] text-slate-400 mt-1 block">Only letters and hyphens, no spaces.</span>}
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    {currentLang === 'ru' ? 'Тип товара' : 'Product Type'} *
                  </label>
                  <select
                    id="form-select-type"
                    value={formData.type || 'peptide'}
                    onChange={(e) => {
                      const nextType = e.target.value as Product['type'];
                      // Nudge the unit toward the common case for the new type - still freely
                      // overridable right next to it (a peptide can be ml, a good can be mg).
                      const nextUnit = nextType === 'peptide' ? 'mg' : 'pcs';
                      setFormData({ ...formData, type: nextType, unit: nextUnit });
                    }}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-nadeck-500 focus:outline-none"
                  >
                    <option value="peptide">{currentLang === 'ru' ? 'Пептид' : 'Peptide'}</option>
                    <option value="additional_good">{currentLang === 'ru' ? 'Доп. товар (шприцы, витамины и т.д.)' : 'Additional Good (syringes, vitamins, ...)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    {currentLang === 'ru' ? 'Единица измерения' : 'Unit'} *
                  </label>
                  <select
                    id="form-select-unit"
                    value={formData.unit || 'mg'}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as Product['unit'] })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-nadeck-500 focus:outline-none"
                  >
                    <option value="mg">{currentLang === 'ru' ? 'мг (порошок/капсулы)' : 'mg (powder/capsules)'}</option>
                    <option value="ml">{currentLang === 'ru' ? 'мл (жидкость)' : 'ml (liquid)'}</option>
                    <option value="pcs">{currentLang === 'ru' ? 'шт (поштучно)' : 'pcs (unit count)'}</option>
                  </select>
                </div>

                {/* One category per storefront, each offering only that market's own rows. A
                    market-scoped admin sees just their own, same as the galleries below. */}
                {adminMarket !== 'ar' && (
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    {currentLang === 'ru' ? 'Категория' : 'Category'}
                    {adminMarket ? '' : ' — nadeck.net'} *
                  </label>
                  <select
                    id="form-select-category"
                    value={formData.category || defaultCategoryId}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-nadeck-500 focus:outline-none"
                  >
                    {mainCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {categoryLabelById[category.id]}
                      </option>
                    ))}
                  </select>
                </div>
                )}

                {adminMarket !== 'main' && (
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    {currentLang === 'ru' ? 'Категория' : 'Category'}
                    {adminMarket ? '' : ' — ar.nadeck.net'} {adminMarket ? '*' : ''}
                  </label>
                  <select
                    id="form-select-category-ar"
                    value={formData.categoryAr || defaultCategoryIdAr}
                    onChange={(e) => setFormData({ ...formData, categoryAr: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-nadeck-500 focus:outline-none"
                  >
                    {/* Optional for a full admin: left blank, the Arabic site falls back to the
                        nadeck.net category above. A scoped ar admin has no such fallback to
                        offer - that product's only category is this one. */}
                    {!adminMarket && (
                      <option value="">
                        {currentLang === 'ru' ? '— как на nadeck.net —' : '— same as nadeck.net —'}
                      </option>
                    )}
                    {arCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {categoryLabelById[category.id]}
                      </option>
                    ))}
                  </select>
                </div>
                )}
              </div>

              {/* Grid 2 Block: Images, Form, and Ratings */}
              <div className={`grid grid-cols-1 gap-5 ${isPeptideForm ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                {/* One gallery per storefront - the same product can be photographed differently
                    for nadeck.net and ar.nadeck.net. A market-scoped admin manages only their own
                    storefront (see User.adminMarket), so the other market's gallery is hidden from
                    them entirely - along with the cross-market fallback note, which is only
                    actionable for a full admin who can see both. */}
                <div className="md:col-span-2 space-y-4">
                  {adminMarket !== 'ar' && renderProductGallery(
                    'images',
                    currentLang === 'ru' ? 'Фото для nadeck.net' : 'Photos for nadeck.net',
                    currentLang === 'ru'
                      ? `Первое фото — обложка в каталоге. На странице товара покупатель сможет пролистать все фото.${adminMarket ? '' : ' Если пусто — возьмутся фото ar.nadeck.net.'}`
                      : `The first photo is the catalog cover. Shoppers can flip through all photos on the product page.${adminMarket ? '' : ' Left empty, the ar.nadeck.net photos are used instead.'}`,
                  )}
                  {adminMarket !== 'main' && renderProductGallery(
                    'imagesAr',
                    currentLang === 'ru' ? 'Фото для ar.nadeck.net' : 'Photos for ar.nadeck.net',
                    currentLang === 'ru'
                      ? (adminMarket
                        ? 'Первое фото — обложка в каталоге. На странице товара покупатель сможет пролистать все фото.'
                        : 'Отдельная галерея для арабского сайта. Если пусто — там показываются фото nadeck.net.')
                      : (adminMarket
                        ? 'The first photo is the catalog cover. Shoppers can flip through all photos on the product page.'
                        : 'A separate gallery for the Arabic site. Left empty, it shows the nadeck.net photos.'),
                  )}
                </div>

                {isPeptideForm && (
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1.5">
                    {currentLang === 'ru' ? 'Форма выпуска' : 'Packaging Form'}
                  </label>
                  <select
                    id="form-select-form"
                    value={formData.form || 'vial'}
                    onChange={(e) => setFormData({ ...formData, form: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-nadeck-500 focus:outline-none"
                  >
                    <option value="vial">Vial (Ампула/Флакон)</option>
                    <option value="tablet">Tablet (Таблированный)</option>
                    <option value="capsule">Capsule (Капсула)</option>
                    <option value="liquid">Liquid (Жидкий раствор)</option>
                  </select>
                </div>
                )}

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
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:border-nadeck-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Which storefront(s) list this product - independent of translated content.
                  A market-scoped admin can't change this (the backend pins it to their own
                  market regardless), so they get a locked readout instead of checkboxes. */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 space-y-2.5" id="form-markets-box">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  {currentLang === 'ru' ? 'Показывать на сайтах' : 'Visible on'}
                </span>
                {adminMarket ? (
                  <p className="text-xs font-semibold text-slate-500">
                    {adminMarket === 'ar' ? 'ar.nadeck.net' : 'nadeck.net'}
                    {' '}
                    <span className="font-normal text-slate-400">
                      {currentLang === 'ru' ? '(закреплено за вашей учётной записью)' : '(fixed for your account)'}
                    </span>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {(['main', 'ar'] as const).map((market) => {
                      const active = (formData.markets && formData.markets.length > 0 ? formData.markets : ['main']).includes(market);
                      return (
                        <label key={market} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                          <input
                            id={`form-checkbox-market-${market}`}
                            type="checkbox"
                            checked={active}
                            onChange={() => {
                              const current = formData.markets && formData.markets.length > 0 ? formData.markets : ['main'];
                              const next = active ? current.filter((m) => m !== market) : [...current, market];
                              setFormData({ ...formData, markets: next });
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-nadeck-600 focus:ring-nadeck-500"
                          />
                          {market === 'main' ? 'nadeck.net' : 'ar.nadeck.net'}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Grid 3 Block: Medicine Dose Parameters for precise calculation engine support -
                  peptide-only. The volumes/pricing manager below it applies to every product type. */}
              <div className="bg-nadeck-500/5 p-4 rounded-2xl border border-nadeck-500/10 space-y-4" id="form-dosage-rules-box">
                {isPeptideForm && (
                <>
                <span className="text-[10px] uppercase font-bold text-nadeck-800 tracking-wider">
                  🧪 Настройки расчёта дозировок (Dosage Calculation Parameters)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
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
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:border-nadeck-500 focus:outline-none"
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
                          ...(formData.dosageRules || { defaultDailyDoses: 1 }),
                          mgPerKgPerDay: Number(e.target.value)
                        }
                      })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:border-nadeck-500 focus:outline-none"
                    />
                  </div>

                  {formData.dosageRules?.defaultFrequency === 'custom' ? (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {currentLang === 'ru' ? 'Раз в сколько дней' : 'Interval (every N days)'}
                      </label>
                      <input
                        id="form-input-rules-interval"
                        type="number"
                        min="1"
                        placeholder="20"
                        value={formData.dosageRules?.customIntervalDays || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          dosageRules: {
                            ...(formData.dosageRules || { mgPerKgPerDay: 0.005, defaultDailyDoses: 1 }),
                            customIntervalDays: Number(e.target.value)
                          }
                        })}
                        className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:border-nadeck-500 focus:outline-none"
                      />
                    </div>
                  ) : (
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
                            ...(formData.dosageRules || { mgPerKgPerDay: 0.005 }),
                            defaultDailyDoses: Number(e.target.value)
                          }
                        })}
                        className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:border-nadeck-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {currentLang === 'ru' ? 'Частота приёма по умолчанию' : 'Default dosing frequency'}
                    </label>
                    <select
                      id="form-input-rules-frequency"
                      value={formData.dosageRules?.defaultFrequency || 'daily'}
                      onChange={(e) => setFormData({
                        ...formData,
                        dosageRules: {
                          ...(formData.dosageRules || { mgPerKgPerDay: 0.005, defaultDailyDoses: 1 }),
                          defaultFrequency: e.target.value as DosageFrequency
                        }
                      })}
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:border-nadeck-500 focus:outline-none bg-white"
                    >
                      <option value="daily">{currentLang === 'ru' ? 'Раз в день' : 'Once daily'}</option>
                      <option value="twice_daily">{currentLang === 'ru' ? '2 раза в день' : 'Twice daily'}</option>
                      <option value="every_other_day">{currentLang === 'ru' ? 'Через день' : 'Every other day'}</option>
                      <option value="weekly">{currentLang === 'ru' ? 'Раз в неделю' : 'Once weekly'}</option>
                      <option value="custom">{currentLang === 'ru' ? 'Другое (задать интервал)' : 'Other (custom interval)'}</option>
                    </select>
                  </div>
                </div>
                </>
                )}

                {/* Available Volumes manager: each volume has its own mg strength AND its own price -
                    applies to every product type, so it's never hidden by the peptide-only toggle above. */}
                <div className={isPeptideForm ? 'pt-4 border-t border-nadeck-500/10' : ''} id="form-volumes-box">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    {currentLang === 'ru' ? 'Доступные объёмы и цены' : 'Available Volumes & Prices'}
                  </label>
                  <p className="text-[10px] text-slate-400 mb-2">
                    {currentLang === 'ru'
                      ? 'Чтобы изменить цену уже добавленного объёма — введите тот же вес (мг) с новыми ценами и нажмите «Добавить».'
                      : 'To change an existing volume’s price, re-enter the same mg value with new prices and press "Add".'}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2" id="form-volumes-list">
                    {volumesList.length === 0 && (
                      <span className="text-[11px] text-slate-400">
                        {currentLang === 'ru' ? 'Объёмы не добавлены' : 'No volumes added yet'}
                      </span>
                    )}
                    {volumesList.map((vol) => (
                      <span
                        key={vol.mgPerUnit}
                        id={`form-volume-chip-${vol.mgPerUnit}`}
                        className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-white border border-nadeck-500/20 text-xs font-bold text-nadeck-800"
                      >
                        {vol.mgPerUnit} {volumeUnitLabel} — {vol.price.toLocaleString()} ₸ / ${(vol.priceUsd || 0).toLocaleString()}{vol.priceSar ? ` / ${vol.priceSar.toLocaleString()} SAR` : ''}
                        <button
                          id={`form-volume-remove-${vol.mgPerUnit}`}
                          type="button"
                          onClick={() => handleRemoveVolume(vol.mgPerUnit)}
                          className="p-0.5 rounded-full hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors"
                          title={currentLang === 'ru' ? 'Удалить объём' : 'Remove volume'}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="form-input-new-volume-mg"
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder={currentLang === 'ru' ? `Объём, ${volumeUnitLabel}` : `Volume, ${volumeUnitLabel}`}
                      value={newVolumeMg}
                      onChange={(e) => setNewVolumeMg(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddVolume();
                        }
                      }}
                      className="w-28 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-nadeck-500 focus:outline-none"
                    />
                    <input
                      id="form-input-new-volume-price"
                      type="number"
                      min="0"
                      step="1"
                      placeholder={currentLang === 'ru' ? 'Цена, ₸' : 'Price, ₸'}
                      value={newVolumePrice}
                      onChange={(e) => setNewVolumePrice(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddVolume();
                        }
                      }}
                      className="w-28 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-nadeck-500 focus:outline-none"
                    />
                    <input
                      id="form-input-new-volume-price-usd"
                      type="number"
                      min="0"
                      step="1"
                      placeholder={currentLang === 'ru' ? 'Цена, $' : 'Price, $'}
                      value={newVolumePriceUsd}
                      onChange={(e) => setNewVolumePriceUsd(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddVolume();
                        }
                      }}
                      className="w-28 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-nadeck-500 focus:outline-none"
                    />
                    <input
                      id="form-input-new-volume-price-sar"
                      type="number"
                      min="0"
                      step="1"
                      placeholder={currentLang === 'ru' ? 'Цена, SAR (необязательно)' : 'Price, SAR (optional)'}
                      value={newVolumePriceSar}
                      onChange={(e) => setNewVolumePriceSar(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddVolume();
                        }
                      }}
                      className="w-32 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-nadeck-500 focus:outline-none"
                    />
                    <button
                      id="form-btn-add-volume"
                      type="button"
                      onClick={handleAddVolume}
                      className="px-3 py-2 bg-nadeck-600 hover:bg-nadeck-700 text-white font-bold text-[11px] rounded-lg flex items-center gap-1 active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {currentLang === 'ru' ? 'Добавить' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid 4 Block: Russian (RU) Localized fields */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 space-y-4" id="form-ru-fields">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs uppercase font-black text-slate-800 tracking-wider flex items-center gap-1">
                    🇷🇺 Русский язык (Russian translation config)
                  </span>
                  <button
                    type="button"
                    id="product-translate-btn"
                    onClick={handleTranslateProduct}
                    title={currentLang === 'ru' ? 'Заполнить EN/AR через ИИ по русским полям' : 'Fill EN/AR from Russian fields with AI'}
                    className="normal-case font-bold text-[11px] text-nadeck-600 hover:text-nadeck-700 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-nadeck-500/10 transition-colors"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    {currentLang === 'ru' ? 'Перевести ИИ (EN/AR)' : 'AI translate (EN/AR)'}
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Название препарата (RU)</label>
                  <input
                    id="form-ru-name"
                    type="text"
                    placeholder="Напр. Семаглутид 5мг"
                    value={locNames.ru}
                    onChange={(e) => setLocNames({ ...locNames, ru: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500"
                  />
                </div>

                <div className={`grid grid-cols-1 gap-4 ${isPeptideForm ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Краткое описание (RU)</label>
                    <textarea
                      id="form-ru-desc"
                      rows={2}
                      placeholder="Революционный пептид для снижения аппетита..."
                      value={locDescs.ru}
                      onChange={(e) => setLocDescs({ ...locDescs, ru: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 resize-none animate-height"
                    />
                  </div>
                  {isPeptideForm && (
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Инструкция применения (RU)</label>
                    <textarea
                      id="form-ru-usage"
                      rows={2}
                      placeholder="Вводить подкожно 1 раз в неделю..."
                      value={locUsages.ru}
                      onChange={(e) => setLocUsages({ ...locUsages, ru: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 resize-none"
                    />
                  </div>
                  )}
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Полная аннотация клиническая (RU)</label>
                    <textarea
                      id="form-ru-full-desc"
                      rows={2}
                      placeholder="Семаглутид — это селективный агонист рецепторов ГПП-1..."
                      value={locFullDescs.ru}
                      onChange={(e) => setLocFullDescs({ ...locFullDescs, ru: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 resize-none"
                    />
                  </div>
                </div>

                {isPeptideForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Показания к применению (RU, разделяйте новые строки)</label>
                    <textarea
                      id="form-ru-inds"
                      rows={2}
                      placeholder="Избыточная масса тела&#10;Инсулинорезистентность"
                      value={locInds.ru}
                      onChange={(e) => setLocInds({ ...locInds, ru: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 font-mono"
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
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 font-mono"
                    />
                  </div>
                </div>
                )}
              </div>

              {/* Grid 5 Block: English (EN) Localized fields */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 space-y-4" id="form-en-fields">
                <span className="text-xs uppercase font-black text-slate-800 tracking-wider flex items-center gap-1">
                  🇺🇸 English (English translation layout)
                </span>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Brand/Name (EN) *</label>
                  <input
                    id="form-en-name"
                    type="text"
                    required
                    placeholder="e.g. Semaglutide 5mg"
                    value={locNames.en}
                    onChange={(e) => setLocNames({ ...locNames, en: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500"
                  />
                </div>

                <div className={`grid grid-cols-1 gap-4 ${isPeptideForm ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Brief Description (EN)</label>
                    <textarea
                      id="form-en-desc"
                      rows={2}
                      placeholder="Revolutionary peptide for weight management..."
                      value={locDescs.en}
                      onChange={(e) => setLocDescs({ ...locDescs, en: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 resize-none"
                    />
                  </div>
                  {isPeptideForm && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Usage / Method (EN)</label>
                    <textarea
                      id="form-en-usage"
                      rows={2}
                      placeholder="Subcutaneous injection once weekly..."
                      value={locUsages.en}
                      onChange={(e) => setLocUsages({ ...locUsages, en: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 resize-none"
                    />
                  </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Full Description (EN)</label>
                    <textarea
                      id="form-en-full-desc"
                      rows={2}
                      placeholder="Semaglutide is a selective GLP-1 receptor agonist..."
                      value={locFullDescs.en}
                      onChange={(e) => setLocFullDescs({ ...locFullDescs, en: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 resize-none"
                    />
                  </div>
                </div>

                {isPeptideForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Indications (EN, split by newlines)</label>
                    <textarea
                      id="form-en-inds"
                      rows={2}
                      placeholder="Excess body weight&#10;Insulin resistance"
                      value={locInds.en}
                      onChange={(e) => setLocInds({ ...locInds, en: e.target.value })}
                      className="w-full px-3 py-1.5 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 font-mono"
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
                      className="w-full px-3 py-1.5 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 font-mono"
                    />
                  </div>
                </div>
                )}
              </div>

              {/* Grid 6 Block: Arabic (AR) Localized fields */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 space-y-4" id="form-ar-fields" dir="rtl">
                <span className="text-xs uppercase font-black text-slate-800 tracking-wider flex items-center justify-start gap-1">
                  🇸🇦 اللغة العربية (Arabic Translation Configuration)
                </span>
                
                <div className="text-right">
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">الاسم التجاري (AR)</label>
                  <input
                    id="form-ar-name"
                    type="text"
                    placeholder="مثال: سيماجلوتايد 5 ملغ"
                    value={locNames.ar}
                    onChange={(e) => setLocNames({ ...locNames, ar: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 text-right"
                  />
                </div>

                <div className={`grid grid-cols-1 gap-4 text-right ${isPeptideForm ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">وصف موجز (AR)</label>
                    <textarea
                      id="form-ar-desc"
                      rows={2}
                      placeholder="ببتيد ثوري لكبح الشهية..."
                      value={locDescs.ar}
                      onChange={(e) => setLocDescs({ ...locDescs, ar: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs text-right border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 resize-none"
                    />
                  </div>
                  {isPeptideForm && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">طريقة الاستخدام (AR)</label>
                    <textarea
                      id="form-ar-usage"
                      rows={2}
                      placeholder="حقن تحت الجلد مرة واحدة في الأسبوع..."
                      value={locUsages.ar}
                      onChange={(e) => setLocUsages({ ...locUsages, ar: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs text-right border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 resize-none"
                    />
                  </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">الوصف الكامل الطبي (AR)</label>
                    <textarea
                      id="form-ar-full-desc"
                      rows={2}
                      placeholder="سيماجلوتايد هو منبه لنبضات الغدد..."
                      value={locFullDescs.ar}
                      onChange={(e) => setLocFullDescs({ ...locFullDescs, ar: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs text-right border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 resize-none"
                    />
                  </div>
                </div>

                {isPeptideForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">دواعي الاستعمال (AR، كل سطر على حدة)</label>
                    <textarea
                      id="form-ar-inds"
                      rows={2}
                      placeholder="زيادة الوزن&#10;مقاومة الأنسولين"
                      value={locInds.ar}
                      onChange={(e) => setLocInds({ ...locInds, ar: e.target.value })}
                      className="w-full px-3 py-1.5 text-[11px] text-right border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">موانع الاستعمال (AR، كل سطر على حدة)</label>
                    <textarea
                      id="form-ar-contras"
                      rows={2}
                      placeholder="فرط الحساسية&#10;الحمل"
                      value={locContras.ar}
                      onChange={(e) => setLocContras({ ...locContras, ar: e.target.value })}
                      className="w-full px-3 py-1.5 text-[11px] text-right border border-slate-200 rounded-lg focus:outline-none focus:border-nadeck-500 font-mono"
                    />
                  </div>
                </div>
                )}
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
                  className="px-6 py-2.5 bg-slice-950 bg-nadeck-600 hover:bg-nadeck-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                >
                  {currentLang === 'ru' ? 'Сохранить изменения' : 'Save Changes'}
                </button>
              </div>
              </fieldset>

            </form>
          </motion.div>
        )}
      </div>

      <MediaLibraryModal
        isOpen={mediaLibraryTarget !== null}
        currentLang={currentLang}
        authHeaders={authHeaders}
        initialFolder={mediaLibraryTarget === 'category-icon' ? 'categories' : 'medicines'}
        multiple={mediaLibraryTarget !== null && mediaLibraryTarget !== 'category-icon'}
        onClose={() => setMediaLibraryTarget(null)}
        onSelect={(urls) => {
          if (mediaLibraryTarget === 'category-icon') {
            setCategoryForm((prev) => ({ ...prev, icon: urls[0] }));
          } else if (mediaLibraryTarget) {
            const field = mediaLibraryTarget;
            setFormData((prev) => ({ ...prev, [field]: [...(prev[field] || []), ...urls] }));
          }
        }}
      />
    </div>
  );
}
