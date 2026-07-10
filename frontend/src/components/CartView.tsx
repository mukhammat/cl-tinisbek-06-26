/**
 * @license
 * SPDX-License-Identifier: Apache-1.0
 */

import React, { useState } from 'react';
import { Medicine, Language, CartItem, User, Order } from '../types';
import { TRANSLATIONS } from '../data';
import { Trash2, Phone, MapPin, CreditCard, ShoppingBag, Plus, Minus, ArrowRight, ShieldCheck, CheckCircle2, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CartViewProps {
  currentLang: Language;
  cart: CartItem[];
  onRemoveFromCart: (medId: string) => void;
  onUpdateQty: (medId: string, qty: number) => void;
  user: User;
  onPlaceOrder: (newOrder: Order) => void;
  onClearCart: () => void;
}

export default function CartView({
  currentLang,
  cart,
  onRemoveFromCart,
  onUpdateQty,
  user,
  onPlaceOrder,
  onClearCart
}: CartViewProps) {
  
  // Delivery states
  const [city, setCity] = useState('Алматы');
  const [street, setStreet] = useState(user.address || '');
  const [apartment, setApartment] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user.phone || '');

  // Payment states
  const [payMethod, setPayMethod] = useState<'card' | 'cash'>('card');
  const [cardName, setCardName] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Confirmation state
  const [loading, setLoading] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState<Order | null>(null);
  const [formError, setFormError] = useState('');

  const t = (key: string) => {
    return TRANSLATIONS[key]?.[currentLang] || key;
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.medicine.price * item.quantity), 0);
  };

  const isFreeDelivery = () => {
    return calculateSubtotal() >= 15000;
  };

  const getDeliveryCost = () => {
    if (cart.length === 0) return 0;
    return isFreeDelivery() ? 0 : 1500; // 1500 Tenge flat delivery
  };

  const grandTotal = calculateSubtotal() + getDeliveryCost();

  const handleCardNumberChange = (value: string) => {
    // Format card number as xxxx xxxx xxxx xxxx
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNum(parts.join(' '));
    } else {
      setCardNum(v);
    }
  };

  const handleExpiryChange = (value: string) => {
    // Format MM/YY
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      setCardExpiry(`${v.substring(0, 2)}/${v.substring(2, 4)}`);
    } else {
      setCardExpiry(v);
    }
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

    // Card validation if chosen
    if (payMethod === 'card') {
      if (!cardName || cardNum.length < 15 || cardExpiry.length < 5 || cardCvv.length < 3) {
        setFormError(currentLang === 'ru' ? 'Заполните корректные платежные данные карты!' : currentLang === 'ar' ? 'يرجى ملء بيانات بطاقة الائتمان الصحيحة!' : 'Please fill correct credit card fields.');
        return;
      }
    }

    setLoading(true);

    const orderPayload = {
      email: user.email || 'guest',
      items: cart.map(item => ({
        medicineName: item.medicine.name,
        price: item.medicine.price,
        quantity: item.quantity
      })),
      totalPrice: grandTotal,
      address: {
        city,
        street,
        apartment: apartment || '',
        postalCode: postalCode || '050000'
      },
      paymentMethod: payMethod === 'card' ? t('payCardOnline') : t('payCashOnDelivery')
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
    })
    .catch(err => {
      console.error(err);
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
            <span id="receipt-id" className="text-teal-700">{orderConfirmed.id}</span>
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
            <span>{orderConfirmed.totalPrice.toLocaleString()} {t('currencySymbol')}</span>
          </div>
        </div>

        <div>
          <button
            id="btn-return-catalog"
            onClick={() => setOrderConfirmed(null)}
            className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl inline-flex items-center justify-center gap-2 transition"
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
            <ShoppingBag className="w-5 h-5 text-teal-600" />
            <span>{t('cartTitle')}</span>
          </h2>

          <div className="divide-y divide-slate-100" id="cart-items-list">
            {cart.map((item) => (
              <div 
                key={item.medicine.id} 
                id={`cart-item-row-${item.medicine.id}`}
                className="py-4 flex gap-4 items-center justify-between"
              >
                {/* Thumb */}
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                  <img
                    src={item.medicine.image}
                    alt={item.medicine.name[currentLang]}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{item.medicine.name[currentLang]}</h4>
                  <span className="text-[10px] text-teal-600 font-semibold">{item.medicine.activeSubstance[currentLang]}</span>
                  <div className="text-[10.5px] text-slate-400 font-extrabold mt-0.5">
                    {item.medicine.price.toLocaleString()} {t('currencySymbol')}
                  </div>
                </div>

                {/* Adjust items */}
                <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 py-0.5 px-1 rounded-lg">
                  <button
                    id={`cart-qty-dec-${item.medicine.id}`}
                    onClick={() => onUpdateQty(item.medicine.id, item.quantity - 1)}
                    className="p-1 rounded text-slate-500 hover:text-slate-800"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span id={`cart-qty-num-${item.medicine.id}`} className="w-5 text-center text-xs font-black text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    id={`cart-qty-inc-${item.medicine.id}`}
                    onClick={() => onUpdateQty(item.medicine.id, item.quantity + 1)}
                    className="p-1 rounded text-slate-500 hover:text-slate-800"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Trash delete button */}
                <button
                  id={`cart-item-remove-${item.medicine.id}`}
                  onClick={() => onRemoveFromCart(item.medicine.id)}
                  className="p-2 bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-500 hover:text-rose-700 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

              </div>
            ))}
          </div>

        </div>

        {/* Promo Code section placeholder to look rich */}
        <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm flex items-center justify-between gap-3 text-xs" id="promo-section">
          <div className="flex items-center gap-2 text-slate-500">
            <Ticket className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{currentLang === 'ru' ? 'Промокод или скидочный купон' : 'Promo code or discount coupon'}</span>
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
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:bg-white"
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
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:bg-white"
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
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:bg-white"
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
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:bg-white"
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
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:bg-white"
                />
              </div>
            </div>

          </div>

          {/* Payment Method selectors */}
          <div className="space-y-3" id="payment-selection-box">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('paymentMethodLabel')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                id="payment-method-card"
                type="button"
                onClick={() => setPayMethod('card')}
                className={`p-3 rounded-xl border text-xs font-semibold text-center flex flex-col items-center justify-center gap-1.5 transition ${
                  payMethod === 'card'
                    ? 'border-teal-500 bg-teal-50/50 text-teal-800 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-5 h-5 text-teal-600" />
                <span>{t('payCardOnline')}</span>
              </button>
              <button
                id="payment-method-cash"
                type="button"
                onClick={() => setPayMethod('cash')}
                className={`p-3 rounded-xl border text-xs font-semibold text-center flex flex-col items-center justify-center gap-1.5 transition ${
                  payMethod === 'cash'
                    ? 'border-teal-500 bg-teal-50/50 text-teal-800 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <MapPin className="w-5 h-5 text-teal-600" />
                <span>{t('payCashOnDelivery')}</span>
              </button>
            </div>
          </div>

          {/* Live Virtual Credit Card Mirror UI */}
          {payMethod === 'card' && (
            <div className="space-y-4 pt-2" id="credit-card-details">
              
              {/* Animated Plastic Card visual */}
              <div 
                className="w-full aspect-[1.58/1] bg-gradient-to-tr from-teal-700 to-slate-900 rounded-2xl p-5 text-white flex flex-col justify-between shadow-lg relative overflow-hidden border border-teal-800" 
                id="digital-card"
              >
                {/* Chip illustration mock */}
                <div className="flex justify-between items-start">
                  <div className="w-9 h-7 bg-amber-400/90 rounded-md shadow-inner border border-amber-300 relative overflow-hidden">
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0.5 opacity-20">
                      {[...Array(9)].map((_, i) => <div key={i} className="border border-black" />)}
                    </div>
                  </div>
                  <span className="text-sm font-black italic tracking-wider opacity-90">VISA</span>
                </div>

                {/* Card Number */}
                <div id="card-num-mirror" className="text-base sm:text-lg font-mono font-bold tracking-widest text-center py-2 text-slate-100 select-none">
                  {cardNum || '•••• •••• •••• ••••'}
                </div>

                {/* Card Footer Holder / Exp */}
                <div className="flex justify-between items-end text-[10px] font-mono select-none">
                  <div className="truncate max-w-[170px]">
                    <span className="block opacity-65 text-[7px] uppercase font-sans">Cardholder</span>
                    <span id="card-holder-mirror" className="font-semibold uppercase tracking-wide truncate block">
                      {cardName || 'YOUR FULL NAME'}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block opacity-65 text-[7px] uppercase font-sans">Expires</span>
                    <span id="card-exp-mirror" className="font-semibold tracking-wider">
                      {cardExpiry || 'MM/YY'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Physical credit card inputs */}
              <div className="space-y-3 text-xs" id="card-inputs-fields">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">{t('cardNumberLabel')}</label>
                  <input
                    id="input-card-number"
                    type="text"
                    required={payMethod === 'card'}
                    maxLength={19}
                    placeholder="4000 1234 5678 9010"
                    value={cardNum}
                    onChange={(e) => handleCardNumberChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">{t('cardExpiryLabel')}</label>
                    <input
                      id="input-card-expiry"
                      type="text"
                      required={payMethod === 'card'}
                      maxLength={5}
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => handleExpiryChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl focus:outline-none text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">{t('cardCvvLabel')}</label>
                    <input
                      id="input-card-cvv"
                      type="password"
                      required={payMethod === 'card'}
                      maxLength={3}
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl focus:outline-none text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600">{t('cardHolderLabel')}</label>
                  <input
                    id="input-card-fullname"
                    type="text"
                    required={payMethod === 'card'}
                    placeholder="ALIKHANOV ERZHAN"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase().replace(/[^a-zA-Z\s]/g, ''))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl focus:outline-none"
                  />
                </div>
              </div>

            </div>
          )}

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
            id="btn-confirm-checkout"
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition duration-200 disabled:opacity-50"
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
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Шифрование SSL • Безопасный платеж</span>
          </div>

        </div>

      </form>

    </div>
  );
}
