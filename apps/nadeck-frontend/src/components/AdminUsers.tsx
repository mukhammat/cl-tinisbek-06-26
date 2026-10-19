/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, ChevronDown, Loader2, Mail, MapPin, Phone, RefreshCw, Search, Send, ShoppingBag, UserRound } from 'lucide-react';
import { Language } from '../types';

// Everyone the shop knows about (GET /api/admin/users): registered accounts with their email
// confirmation, Telegram customers (bot chats and bot orders) and site orders placed without an
// account - each with the orders they made.

type PersonKind = 'account' | 'telegram' | 'guest';

interface PersonOrder {
  id: string;
  date: string;
  status: string;
  totalPrice: number;
  totalPriceUsd: number;
  items: { name: Record<string, string>; quantity: number }[];
  promoCode: string | null;
}

interface Person {
  key: string;
  kind: PersonKind;
  email: string | null;
  name: string;
  phone: string;
  address: string;
  emailVerified: boolean | null;
  isAdmin: boolean;
  registeredAt: string | null;
  telegram: { username: string | null; telegramId: string | null } | null;
  firstSeenAt: string | null;
  lastActivityAt: string | null;
  orders: PersonOrder[];
  ordersCount: number;
  totalKzt: number;
}

interface UsersResponse {
  people: Person[];
  totals: { accounts: number; verified: number; accountsWithOrders: number; telegram: number; guestOrders: number };
}

type Filter = 'all' | 'account' | 'verified' | 'unverified' | 'telegram' | 'guest' | 'buyers';

const STATUS_LABELS: Record<string, { ru: string; en: string; className: string }> = {
  pending: { ru: 'Ожидание', en: 'Pending', className: 'bg-amber-50 text-amber-700' },
  processing: { ru: 'Сборка', en: 'Processing', className: 'bg-sky-50 text-sky-700' },
  shipped: { ru: 'В пути', en: 'Shipped', className: 'bg-indigo-50 text-indigo-700' },
  delivered: { ru: 'Вручено', en: 'Delivered', className: 'bg-emerald-50 text-emerald-700' },
};

const formatDate = (iso: string | null, isRu: boolean) =>
  iso ? new Date(iso).toLocaleDateString(isRu ? 'ru-RU' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const formatKzt = (value: number) => `${Math.round(value).toLocaleString('ru-RU')} ₸`;

// Newest first: accounts by registration, Telegram customers by their first message. People
// with neither (old accounts, guests) go last, the ones with more orders ahead.
const sortTime = (p: Person) => Date.parse(p.registeredAt || p.firstSeenAt || '') || 0;

export default function AdminUsers({ currentLang, token }: { currentLang: Language; token?: string }) {
  const isRu = currentLang === 'ru';
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setErrorMsg('');
    fetch('/api/admin/users', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || `${res.status}`);
        return res.json();
      })
      .then((body: UsersResponse) => setData(body))
      .catch((err) => setErrorMsg(String(err.message || err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const visible = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.people
      .filter((p) => {
        switch (filter) {
          case 'account': return p.kind === 'account';
          case 'verified': return p.kind === 'account' && p.emailVerified;
          case 'unverified': return p.kind === 'account' && !p.emailVerified;
          case 'telegram': return p.kind === 'telegram';
          case 'guest': return p.kind === 'guest';
          case 'buyers': return p.ordersCount > 0;
          default: return true;
        }
      })
      .filter((p) => {
        if (!q) return true;
        const haystack = [p.email, p.name, p.phone, p.address, p.telegram?.username, p.telegram?.telegramId, ...p.orders.map((o) => o.id)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => sortTime(b) - sortTime(a) || b.ordersCount - a.ordersCount);
  }, [data, filter, query]);

  const totals = data?.totals;
  const filters: { id: Filter; ru: string; en: string }[] = [
    { id: 'all', ru: 'Все', en: 'All' },
    { id: 'account', ru: 'Зарегистрированы', en: 'Registered' },
    { id: 'verified', ru: 'Почта подтверждена', en: 'Email confirmed' },
    { id: 'unverified', ru: 'Не подтвердили', en: 'Not confirmed' },
    { id: 'telegram', ru: 'Telegram', en: 'Telegram' },
    { id: 'guest', ru: 'Без регистрации', en: 'No account' },
    { id: 'buyers', ru: 'С заказами', en: 'With orders' },
  ];

  return (
    <div className="space-y-4" id="view-admin-users">
      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: isRu ? 'Зарегистрировано' : 'Registered', value: totals?.accounts },
          { label: isRu ? 'Подтвердили почту' : 'Email confirmed', value: totals ? `${totals.verified} / ${totals.accounts}` : undefined },
          { label: isRu ? 'Клиентов в Telegram' : 'Telegram customers', value: totals?.telegram },
          { label: isRu ? 'Заказов без регистрации' : 'Orders without account', value: totals?.guestOrders },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{card.value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="admin-users-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isRu ? 'Email, имя, телефон, @username, номер заказа…' : 'Email, name, phone, @username, order id…'}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-nadeck-500 focus:bg-white"
            />
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="shrink-0 px-3 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            aria-label={isRu ? 'Обновить' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === f.id ? 'bg-nadeck-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {isRu ? f.ru : f.en}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {errorMsg}
        </div>
      )}

      {!data && loading && (
        <div className="py-12 flex justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      )}

      {data && (
        <p className="text-xs text-slate-400 px-1">
          {isRu ? `Показано: ${visible.length}` : `Showing ${visible.length}`}
        </p>
      )}

      <div className="space-y-2">
        {visible.map((p) => {
          const open = openKey === p.key;
          const title =
            p.kind === 'telegram'
              ? p.name || (p.telegram?.username ? `@${p.telegram.username}` : `Telegram ${p.telegram?.telegramId ?? ''}`)
              : p.kind === 'guest' && !p.email
                ? (isRu ? 'Гости без аккаунта (заказы через сайт)' : 'Guests without an account (site orders)')
                : p.name || p.email || '—';
          return (
            <div key={p.key} className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenKey(open ? null : p.key)}
                className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-50/60"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  p.kind === 'telegram' ? 'bg-sky-50 text-sky-600' : p.kind === 'guest' ? 'bg-slate-100 text-slate-500' : 'bg-nadeck-50 text-nadeck-600'
                }`}>
                  {p.kind === 'telegram' ? <Send className="w-4 h-4" /> : <UserRound className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-900 break-all">{title}</span>
                    {p.kind === 'account' && (
                      p.emailVerified ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg text-emerald-700 bg-emerald-50 flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3" /> {isRu ? 'почта подтверждена' : 'email confirmed'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg text-amber-700 bg-amber-50">
                          {isRu ? 'почта не подтверждена' : 'email not confirmed'}
                        </span>
                      )
                    )}
                    {p.kind === 'telegram' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg text-sky-700 bg-sky-50">Telegram</span>
                    )}
                    {p.kind === 'guest' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg text-slate-600 bg-slate-100">{isRu ? 'без регистрации' : 'no account'}</span>
                    )}
                    {p.isAdmin && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg text-violet-700 bg-violet-50">{isRu ? 'админ' : 'admin'}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    {p.email && p.kind === 'account' && p.name && <span className="flex items-center gap-1 break-all"><Mail className="w-3 h-3 shrink-0" />{p.email}</span>}
                    {p.kind === 'guest' && p.email && <span className="flex items-center gap-1 break-all"><Mail className="w-3 h-3 shrink-0" />{p.email}</span>}
                    {p.telegram?.username && p.name && <span>@{p.telegram.username}</span>}
                    {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{p.phone}</span>}
                    {p.kind === 'account' && (
                      <span>{isRu ? 'регистрация' : 'registered'}: {formatDate(p.registeredAt, isRu)}</span>
                    )}
                    {p.kind === 'telegram' && p.firstSeenAt && (
                      <span>{isRu ? 'первое сообщение' : 'first message'}: {formatDate(p.firstSeenAt, isRu)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-slate-900 flex items-center justify-end gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-400" /> {p.ordersCount}
                  </p>
                  {p.ordersCount > 0 && <p className="text-[11px] text-slate-500 font-semibold">{formatKzt(p.totalKzt)}</p>}
                  <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto mt-1 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {open && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-50 space-y-3 text-sm">
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-600 pt-2">
                    {p.email && <p><span className="text-slate-400">Email:</span> <span className="break-all">{p.email}</span></p>}
                    {p.telegram && (
                      <p>
                        <span className="text-slate-400">Telegram:</span>{' '}
                        {p.telegram.username ? (
                          <a href={`https://t.me/${p.telegram.username}`} target="_blank" rel="noreferrer" className="text-nadeck-600 hover:underline">@{p.telegram.username}</a>
                        ) : (
                          `id ${p.telegram.telegramId}`
                        )}
                      </p>
                    )}
                    {p.phone && <p><span className="text-slate-400">{isRu ? 'Телефон' : 'Phone'}:</span> {p.phone}</p>}
                    {p.address && <p className="flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />{p.address}</p>}
                    {p.lastActivityAt && <p><span className="text-slate-400">{isRu ? 'Последнее сообщение боту' : 'Last message to the bot'}:</span> {formatDate(p.lastActivityAt, isRu)}</p>}
                  </div>

                  {p.orders.length === 0 ? (
                    <p className="text-xs text-slate-400">{isRu ? 'Заказов нет' : 'No orders'}</p>
                  ) : (
                    <div className="space-y-2">
                      {p.orders.map((o) => {
                        const status = STATUS_LABELS[o.status];
                        return (
                          <div key={o.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-black text-slate-900">{o.id}</span>
                              <span className="text-xs text-slate-400">{o.date}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${status?.className ?? 'bg-slate-100 text-slate-600'}`}>
                                {status ? (isRu ? status.ru : status.en) : o.status}
                              </span>
                              {o.promoCode && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-violet-50 text-violet-700">{o.promoCode}</span>}
                              <span className="ml-auto text-xs font-black text-slate-900">{formatKzt(o.totalPrice)}</span>
                            </div>
                            <p className="text-xs text-slate-600">
                              {o.items.map((i) => `${i.name?.[currentLang] || i.name?.ru || ''} × ${i.quantity}`).join(', ')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {data && visible.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-10">{isRu ? 'Никого не найдено' : 'Nobody found'}</p>
        )}
      </div>
    </div>
  );
}
