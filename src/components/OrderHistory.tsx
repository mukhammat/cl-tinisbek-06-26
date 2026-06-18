/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, Language } from '../types';
import { TRANSLATIONS } from '../data';
import { Clock, CheckCircle2, ChevronDown, Package, MapPin, AlertCircle, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';

interface OrderHistoryProps {
  currentLang: Language;
  orders: Order[];
  searchQuery?: string;
}

export default function OrderHistory({
  currentLang,
  orders,
  searchQuery = ''
}: OrderHistoryProps) {

  const t = (key: string) => {
    return TRANSLATIONS[key]?.[currentLang] || key;
  };

  const getStatusStyle = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'shipped':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending': return t('statusPending');
      case 'processing': return t('statusPending');
      case 'shipped': return t('statusShipped');
      case 'delivered': return t('statusDelivered');
    }
  };

  const filteredOrders = searchQuery.trim()
    ? orders.filter((order) => {
        const query = searchQuery.toLowerCase();
        
        const idMatch = (order.id || '').toLowerCase().includes(query);
        const dateMatch = (order.date || '').toLowerCase().includes(query);
        const payMatch = (order.paymentMethod || '').toLowerCase().includes(query);
        const statusMatch = (order.status || '').toLowerCase().includes(query) || 
                            (getStatusLabel(order.status) || '').toLowerCase().includes(query);
        
        const addr = order.address;
        const addrMatch = (addr?.city || '').toLowerCase().includes(query) ||
                          (addr?.street || '').toLowerCase().includes(query) ||
                          (addr?.apartment || '').toLowerCase().includes(query) ||
                          (addr?.postalCode || '').toLowerCase().includes(query);
                          
        const itemsMatch = (order.items || []).some((item) => {
          const nameMap = item.medicineName || {};
          return (nameMap[currentLang] || '').toLowerCase().includes(query) ||
                 (nameMap['ru'] || '').toLowerCase().includes(query) ||
                 (nameMap['en'] || '').toLowerCase().includes(query);
        });
        
        return idMatch || dateMatch || payMatch || statusMatch || addrMatch || itemsMatch;
      })
    : orders;

  return (
    <div className="space-y-6" id="order-history-section">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4" id="history-header">
        <div className="space-y-1">
          <h2 id="history-title" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{t('historyHeader')}</h2>
          <p className="text-xs text-slate-500">Отслеживайте свои заказы и просматривайте прошлые покупки.</p>
        </div>
        {searchQuery.trim() && (
          <div className="bg-teal-50 text-teal-700 text-xs font-black px-3 py-1.5 rounded-xl border border-teal-100 self-start sm:self-center">
            {currentLang === 'ru' ? `Найдено заказов: ${filteredOrders.length}` : `Orders found: ${filteredOrders.length}`}
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm p-8" id="history-empty">
          <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-xs sm:text-sm font-semibold text-slate-600">{t('historyEmpty')}</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm p-8" id="history-search-empty">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <p className="text-xs sm:text-sm font-semibold text-slate-600">
            {currentLang === 'ru' ? 'Заказы не найдены по вашему запросу' : 'No orders matched your search query'}
          </p>
        </div>
      ) : (
        <div className="space-y-4" id="orders-list-box">
          {filteredOrders.map((order) => (
            <div 
              key={order.id} 
              id={`order-history-item-${order.id}`}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
            >
              
              {/* Header metadata row */}
              <div className="p-4 sm:p-5 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span id={`order-id-${order.id}`} className="font-extrabold text-slate-900 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                    #{order.id}
                  </span>
                  <span className="text-slate-400 font-semibold">{order.date}</span>
                </div>
                {/* Status indicator badge */}
                <span id={`order-status-${order.id}`} className={`px-2.5 py-1 rounded-full border text-[10.5px] font-bold ${getStatusStyle(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>

              {/* Order items breakout */}
              <div className="p-4 sm:p-5 gap-4 flex flex-col sm:flex-row justify-between">
                
                {/* List of drugs */}
                <div className="space-y-3 flex-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 text-xs sm:text-sm text-slate-700 font-medium">
                      <span className="text-slate-400">{item.quantity} шт ×</span>
                      <span className="text-slate-900 font-bold">{item.medicineName[currentLang]}</span>
                      <span className="text-slate-400 font-semibold">({item.price.toLocaleString()} {t('currencySymbol')})</span>
                    </div>
                  ))}

                  {/* Address coordinates footer */}
                  <div className="pt-3 border-t border-slate-50 text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span id={`order-address-${order.id}`}>
                      {order.address.city}, {order.address.street}, {order.address.apartment || ''} ({order.address.postalCode})
                    </span>
                  </div>
                </div>

                {/* Right hand pricing */}
                <div className="text-left sm:text-right shrink-0 pt-3 sm:pt-0 sm:border-l sm:border-slate-50 sm:pl-6 flex flex-col justify-between">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-semibold uppercase">{t('totalToPay')}</span>
                    <span id={`order-total-${order.id}`} className="text-base sm:text-lg font-black text-teal-800">
                      {order.totalPrice.toLocaleString()} {t('currencySymbol')}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium italic mt-2 block sm:mt-0">
                    Оплата: {order.paymentMethod}
                  </span>
                </div>

              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
