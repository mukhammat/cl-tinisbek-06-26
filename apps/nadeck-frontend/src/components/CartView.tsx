/**
 * @license
 * SPDX-License-Identifier: Apache-1.0
 */

import React, { useState } from 'react';
import { Language, CartItem, User, Order } from '../types';
import { TRANSLATIONS } from '../data';
import { resolvePrice, getPrimaryVolume, FREE_DELIVERY_THRESHOLD, DELIVERY_COST } from '../currency';
import { MARKET } from '../market';
import { Trash2, Phone, ShoppingBag, Plus, Minus, ArrowRight, MessageCircle, CheckCircle2, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CartViewProps {
  currentLang: Language;
  cart: CartItem[];
  onRemoveFromCart: (medId: string, selectedVolume?: number) => void;
  onUpdateQty: (medId: string, qty: number, selectedVolume?: number) => void;
  user: User;
  onPlaceOrder: (newOrder: Order) => void;
  onClearCart: () => void;
  onGoToAdditionalGoods: () => void;
}

export default function CartView({
  currentLang,
  cart,
  onRemoveFromCart,
  onUpdateQty,
  user,
  onPlaceOrder,
  onClearCart,
  onGoToAdditionalGoods
}: CartViewProps) {
  
  // Delivery states
  const [city, setCity] = useState('Алматы');
  const [street, setStreet] = useState(user.address || '');
  const [apartment, setApartment] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user.phone || '');

  // WhatsApp number that receives the order template (payment gateway integration
  // requires a live site for callbacks, so orders are confirmed/paid via WhatsApp for now)
  const WHATSAPP_NUMBER = '77070222312';

  // Confirmation state
  const [loading, setLoading] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState<Order | null>(null);
  const [formError, setFormError] = useState('');

  const t = (key: string) => {
    return TRANSLATIONS[key]?.[currentLang] || key;
  };

  const unitPriceKzt = (item: CartItem) => item.unitPrice ?? getPrimaryVolume(item.medicine).price;
  const unitPriceUsdOf = (item: CartItem) => item.unitPriceUsd ?? getPrimaryVolume(item.medicine).priceUsd ?? 0;
  const unitPriceSarOf = (item: CartItem) => item.unitPriceSar ?? getPrimaryVolume(item.medicine).priceSar ?? 0;
  const unitPriceDisplay = (item: CartItem) => resolvePrice(unitPriceKzt(item), unitPriceUsdOf(item), unitPriceSarOf(item), currentLang);

  const calculateSubtotalKzt = () => cart.reduce((total, item) => total + unitPriceKzt(item) * item.quantity, 0);
  const calculateSubtotalUsd = () => cart.reduce((total, item) => total + unitPriceUsdOf(item) * item.quantity, 0);
  const calculateSubtotalSar = () => cart.reduce((total, item) => total + unitPriceSarOf(item) * item.quantity, 0);
  const calculateSubtotal = () => resolvePrice(calculateSubtotalKzt(), calculateSubtotalUsd(), calculateSubtotalSar(), currentLang);

  // Flat delivery fee per currency (not a straight FX conversion), so KZT and USD checkouts
  // each cross their own free-delivery threshold independently. SAR (ar.nadeck.net) has no
  // free tier at all - delivery there is always the flat fee, per business decision.
  type DeliveryCurrency = 'kzt' | 'usd' | 'sar';
  const getDeliveryCostForCurrency = (currency: DeliveryCurrency) => {
    if (cart.length === 0) return 0;
    if (currency === 'sar') return DELIVERY_COST.sar;
    const subtotal = currency === 'kzt' ? calculateSubtotalKzt() : calculateSubtotalUsd();
    const threshold = currency === 'kzt' ? FREE_DELIVERY_THRESHOLD.kzt : FREE_DELIVERY_THRESHOLD.usd;
    if (subtotal >= threshold) return 0;
    return currency === 'kzt' ? DELIVERY_COST.kzt : DELIVERY_COST.usd;
  };

  const activeDeliveryCurrency: DeliveryCurrency = MARKET === 'ar' ? (currentLang === 'ar' ? 'sar' : 'usd') : (currentLang === 'ru' ? 'kzt' : 'usd');
  const getDeliveryCost = () => getDeliveryCostForCurrency(activeDeliveryCurrency);
  const isFreeDelivery = () => getDeliveryCost() === 0;

  const grandTotalKzt = calculateSubtotalKzt() + getDeliveryCostForCurrency('kzt');
  const grandTotalUsd = calculateSubtotalUsd() + getDeliveryCostForCurrency('usd');
  const grandTotalSar = calculateSubtotalSar() + getDeliveryCostForCurrency('sar');
  const grandTotal = resolvePrice(grandTotalKzt, grandTotalUsd, grandTotalSar, currentLang);

  const buildWhatsAppMessage = () => {
    const heading = currentLang === 'ru' ? 'Новый заказ с сайта Nadeck' : currentLang === 'ar' ? 'طلب جديد من موقع Nadeck' : 'New order from Nadeck website';
    const lines = [heading, ''];

    cart.forEach((item) => {
      const unitPrice = unitPriceDisplay(item);
      lines.push(`• ${item.medicine.name[currentLang]}${item.selectedStrength ? ` (${item.selectedStrength} мг)` : ''} x${item.quantity} — ${(unitPrice * item.quantity).toLocaleString()} ${t('currencySymbol')}`);
    });

    lines.push('');
    lines.push(`${t('totalToPay')}: ${grandTotal.toLocaleString()} ${t('currencySymbol')}`);
    lines.push('');
    lines.push(`${t('deliveryAddressLabel')}: ${city}, ${street}${apartment ? ', ' + apartment : ''}`);
    lines.push(`${t('phoneLabel')}: ${phoneNumber}`);

    return lines.join('\n');
  };

  const handleBuy = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (cart.length === 0) return;

    // Delivery fields validation
    if (!city || !street || !phoneNumber) {
      setFormError(currentLang === 'ru' ? 'Заполните адрес доставки и номер телефона!' : currentLang === 'ar' ? 'يرجى إدخال عنوان الشحن ورقم الهاتف!' : 'Please enter delivery address and phone number.');
      return;
    }

    setLoading(true);

    const whatsAppMessage = buildWhatsAppMessage();
    // Open the tab synchronously (within the click's event handler) so browsers don't
    // treat the later redirect as a blocked popup once the async order request resolves.
    const whatsAppTab = window.open('', '_blank');

    const orderPayload = {
      email: user.email || 'guest',
      items: cart.map(item => ({
        medicineName: item.medicine.name,
        price: unitPriceKzt(item),
        priceUsd: unitPriceUsdOf(item),
        priceSar: unitPriceSarOf(item),
        quantity: item.quantity
      })),
      totalPrice: grandTotalKzt,
      totalPriceUsd: grandTotalUsd,
      totalPriceSar: grandTotalSar,
      address: {
        city,
        street,
        apartment: apartment || '',
        postalCode: postalCode || '050000'
      },
      paymentMethod: t('payViaWhatsApp')
    };

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to create order');
      return res.json();
    })
    .then(newCreatedOrder => {
      onPlaceOrder(newCreatedOrder);
      setOrderConfirmed(newCreatedOrder);
      onClearCart();
      const whatsAppUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsAppMessage)}`;
      if (whatsAppTab) {
        whatsAppTab.location.href = whatsAppUrl;
      } else {
        window.open(whatsAppUrl, '_blank');
      }
    })
    .catch(err => {
      console.error(err);
      whatsAppTab?.close();
      setFormError(currentLang === 'ru' ? 'Ошибка при создании заказа!' : currentLang === 'ar' ? 'حدث خطأ أثناء إتمام الطلب!' : 'Error creating order!');
    })
    .finally(() => {
      setLoading(false);
    });
  };

  // If order was successfully completed, show success screen
  if (orderConfirmed) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-xl text-center space-y-6" id="order-success-panel">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100"
        >
          <CheckCircle2 className="w-10 h-10" />
        </motion.div>

        <div className="space-y-2">
          <h2 id="success-header" className="text-2xl font-black text-slate-900 tracking-tight">{t('orderPlacedSuccess')}</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {t('orderEstimateMsg')}
          </p>
        </div>

        {/* Receipt Box */}
        <div className="bg-slate-50 rounded-2xl p-5 text-left text-xs gap-3 flex flex-col border border-slate-100" id="receipt-box">
          <div className="flex justify-between font-bold text-slate-800 border-b border-slate-200 pb-2">
            <span>{t('orderTrackNumber')}:</span>
            <span id="receipt-id" className="text-nadeck-700">{orderConfirmed.id}</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-600">
            <span>{currentLang === 'ru' ? 'Дата оформления' : 'Order Date'}:</span>
            <span>{orderConfirmed.date}</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-600">
            <span>{t('deliveryAddressLabel')}:</span>
            <span className="text-right truncate max-w-[200px]">
              {orderConfirmed.address.city}, {orderConfirmed.address.street}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-slate-600">
            <span>{t('paymentMethodLabel')}:</span>
            <span>{orderConfirmed.paymentMethod}</span>
          </div>
          <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-2 border-t border-slate-200">
            <span>Итого к оплате:</span>
            <span>{resolvePrice(orderConfirmed.totalPrice, orderConfirmed.totalPriceUsd, orderConfirmed.totalPriceSar, currentLang).toLocaleString()} {t('currencySymbol')}</span>
          </div>
        </div>

        <div>
          <button
            id="btn-return-catalog"
            onClick={() => setOrderConfirmed(null)}
            className="w-full sm:w-auto px-6 py-3 bg-nadeck-600 hover:bg-nadeck-700 text-white font-bold text-sm rounded-xl inline-flex items-center justify-center gap-2 transition"
          >
            {t('backToCatalog')}
          </button>
        </div>
      </div>
    );
  }

  // If cart is empty
  if (cart.length === 0) {
    return (
      <div className="py-16 text-center max-w-lg mx-auto bg-white rounded-3xl border border-slate-100 shadow-sm p-8" id="cart-empty-panel">
        <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100 text-slate-400 mb-4 animate-bounce">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-slate-950">{t('cartTitle')}</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
          {t('cartEmpty')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="cart-checkout-layout">
      
      {/* Items Review List -> Spans 7 cols */}
      <div className="lg:col-span-7 space-y-6" id="cart-items-section">
        
        <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 space-y-5 shadow-sm">
          <h2 id="cart-items-title" className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-nadeck-600" />
            <span>{t('cartTitle')}</span>
          </h2>

          <div className="divide-y divide-slate-100" id="cart-items-list">
            {cart.map((item) => {
              const lineKey = `${item.medicine.id}-${item.selectedStrength ?? 'base'}`;
              const unitPrice = unitPriceDisplay(item);
              return (
              <div
                key={lineKey}
                id={`cart-item-row-${lineKey}`}
                className="py-4 flex gap-4 items-center justify-between"
              >
                {/* Thumb */}
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                  <img
                    src={item.medicine.images?.[0]}
                    alt={item.medicine.name[currentLang]}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{item.medicine.name[currentLang]}</h4>
                  {item.selectedStrength ? (
                    <span className="text-[10px] text-nadeck-600 font-semibold">
                      {item.selectedStrength} мг
                    </span>
                  ) : null}
                  <div className="text-[10.5px] text-slate-400 font-extrabold mt-0.5">
                    {unitPrice.toLocaleString()} {t('currencySymbol')}
                  </div>
                </div>

                {/* Adjust items */}
                <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 py-0.5 px-1 rounded-lg">
                  <button
                    id={`cart-qty-dec-${lineKey}`}
                    onClick={() => onUpdateQty(item.medicine.id, item.quantity - 1, item.selectedStrength)}
                    className="p-1 rounded text-slate-500 hover:text-slate-800"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span id={`cart-qty-num-${lineKey}`} className="w-5 text-center text-xs font-black text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    id={`cart-qty-inc-${lineKey}`}
                    onClick={() => onUpdateQty(item.medicine.id, item.quantity + 1, item.selectedStrength)}
                    className="p-1 rounded text-slate-500 hover:text-slate-800"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Trash delete button */}
                <button
                  id={`cart-item-remove-${lineKey}`}
                  onClick={() => onRemoveFromCart(item.medicine.id, item.selectedStrength)}
                  className="p-2 bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-500 hover:text-rose-700 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

              </div>
              );
            })}
          </div>

        </div>

        {/* Promo Code section placeholder to look rich */}
        <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm flex items-center justify-between gap-3 text-xs" id="promo-section">
          <div className="flex items-center gap-2 text-slate-500">
            <Ticket className="w-4 h-4 text-emerald-600" />
            <div className="flex flex-col leading-tight">
              <span className="font-semibold">{currentLang === 'ru' ? 'Промокод или скидочный купон' : 'Promo code or discount coupon'}</span>
              <span className="text-[10px] text-slate-400 font-medium">{currentLang === 'ru' ? 'не обязательно' : 'optional'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="HEALTHPRO" 
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-center uppercase tracking-wider font-extrabold focus:outline-none focus:border-emerald-500 w-28 bg-slate-50 text-slate-800"
            />
            <button className="px-3 bg-slate-800 text-white rounded-lg font-extrabold hover:bg-slate-900">
              OK
            </button>
          </div>
        </div>

      </div>

      {/* Checkout details Form & Payment Card visual -> spans 5 cols */}
      <form onSubmit={handleBuy} className="lg:col-span-12 xl:col-span-5 space-y-6" id="checkout-form-container">
        
        {/* Core checkout info card */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-sm">
          <h3 id="checkout-section-headline" className="text-base font-extrabold text-slate-900 border-b border-slate-50 pb-2.5">
            {t('checkoutSectionHeader')}
          </h3>

          {formError && (
            <div id="checkout-error" className="p-3 text-xs bg-rose-50 border border-rose-100 rounded-xl text-rose-600 font-bold">
              ⚠️ {formError}
            </div>
          )}

          {/* Destination coordinates block */}
          <div className="space-y-4" id="address-inputs">
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">{t('cityLabel')} *</label>
                <input
                  id="checkout-city"
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-nadeck-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">{t('postalCodeLabel')}</label>
                <input
                  id="checkout-postal"
                  type="text"
                  placeholder="050000"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-nadeck-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">{t('streetLabel')} *</label>
              <input
                id="checkout-street"
                type="text"
                required
                placeholder="пр. Аль-Фараби, д. 21"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-nadeck-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">{t('apartmentLabel')}</label>
                <input
                  id="checkout-apartment"
                  type="text"
                  placeholder="кв. 12"
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-nadeck-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">{t('phoneLabel')} *</label>
                <input
                  id="checkout-phone"
                  type="tel"
                  required
                  placeholder="+7 (777) 123-45-67"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-nadeck-500 focus:bg-white"
                />
              </div>
            </div>

          </div>

          {/* Payment note: order is confirmed and paid via WhatsApp with the store manager */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/60" id="payment-whatsapp-note">
            <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 font-semibold leading-relaxed">{t('payViaWhatsAppNote')}</p>
          </div>

        </div>

        {/* Totals Receipt summary */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-4 shadow-xl border border-slate-950" id="receipt-totals-panel">
          
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{currentLang === 'ru' ? 'Информация о платеже' : 'Payment Breakout'}</h4>

          <div className="space-y-2.5 text-xs text-slate-300 font-medium">
            <div className="flex justify-between">
              <span>{t('itemsTotal')}:</span>
              <span>{calculateSubtotal().toLocaleString()} {t('currencySymbol')}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span>{t('deliveryFree')}:</span>
              <span>
                {getDeliveryCost() === 0 ? (
                  <span className="text-emerald-400 font-bold">{t('freeStatus')}</span>
                ) : (
                  <span>{getDeliveryCost().toLocaleString()} {t('currencySymbol')}</span>
                )}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-3 flex justify-between items-baseline">
            <span className="text-xs font-semibold text-slate-400">{t('totalToPay')}:</span>
            <span id="grand-total-price" className="text-2xl font-black text-white">
              {grandTotal.toLocaleString()} {t('currencySymbol')}
            </span>
          </div>

          <button
            id="btn-add-syringes"
            type="button"
            onClick={onGoToAdditionalGoods}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>{currentLang === 'ru' ? 'Добавить шприцы' : 'Add Syringes'}</span>
          </button>

          <button
            id="btn-confirm-checkout"
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-nadeck-500 hover:bg-nadeck-400 text-slate-950 font-black text-sm tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition duration-200 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{t('placeOrderBtn')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-semibold select-none">
            <MessageCircle className="w-4 h-4 text-emerald-500" />
            <span>{t('payViaWhatsAppFooterNote')}</span>
          </div>

        </div>

      </form>

    </div>
  );
}
