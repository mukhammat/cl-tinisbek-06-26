/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { AnalyticsBreakdown, AnalyticsSummary, Language, LANGUAGE_NAME_TRANSLATIONS } from '../types';
import { Users, Eye, MousePointerClick, ShoppingBag, ArrowUpRight, ArrowDownRight, RefreshCw, Globe, Smartphone, Languages as LanguagesIcon, Compass, Layers, AlertTriangle } from 'lucide-react';

interface AnalyticsDashboardProps {
  currentLang: Language;
  token?: string;
}

const PERIODS = [7, 30, 90] as const;

// Every visitor-facing screen the tracker reports, in the order the funnel actually runs.
const PATH_LABELS: Record<string, { ru: string; en: string }> = {
  catalog: { ru: 'Каталог', en: 'Catalog' },
  product: { ru: 'Карточка товара', en: 'Product page' },
  calculator: { ru: 'Калькулятор дозировок', en: 'Dosage calculator' },
  cart: { ru: 'Корзина', en: 'Cart' },
  checkout: { ru: 'Оформление заказа', en: 'Checkout' },
  orders: { ru: 'Мои заказы', en: 'Order history' },
  other: { ru: 'Прочее', en: 'Other' },
};

const DEVICE_LABELS: Record<string, { ru: string; en: string }> = {
  mobile: { ru: 'Телефон', en: 'Mobile' },
  desktop: { ru: 'Компьютер', en: 'Desktop' },
  tablet: { ru: 'Планшет', en: 'Tablet' },
};

// 'AE' -> 🇦🇪. Regional-indicator letters sit 127397 code points above ASCII capitals.
const flagOf = (code: string): string => {
  if (!/^[A-Z]{2}$/.test(code)) return '🌐';
  return String.fromCodePoint(...Array.from(code, (letter) => letter.charCodeAt(0) + 127397));
};

export default function AnalyticsDashboard({ currentLang, token }: AnalyticsDashboardProps) {
  const isRu = currentLang === 'ru';
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const locale = isRu ? 'ru-RU' : 'en-US';
  const formatNumber = (value: number) => Math.round(value).toLocaleString(locale);

  const fetchSummary = () => {
    setLoading(true);
    // The server cuts days at the admin's own midnight, not UTC's - Almaty and Riyadh are
    // both hours ahead, so a UTC "today" would still be showing yesterday all morning.
    const tz = -new Date().getTimezoneOffset();
    const query = new URLSearchParams({ days: String(days), tz: String(tz) });

    fetch(`/api/admin/analytics?${query.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        // The banner has to name the failure: a lapsed admin session (the token is good for
        // 7 days) and a server-side error look identical from this screen otherwise.
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          let detail = body.slice(0, 200);
          try {
            detail = JSON.parse(body)?.message || detail;
          } catch {
            // Not JSON - nginx and Cloudflare answer with HTML, so the raw text is the clue.
          }
          throw new Error(`${res.status}${detail ? `: ${detail}` : ''}`);
        }
        return res.json();
      })
      .then((summary: AnalyticsSummary) => {
        setData(summary);
        setErrorMsg('');
      })
      .catch((err) => {
        console.error(err);
        const reason = err instanceof Error ? err.message : '';
        // 401/403 isn't a broken dashboard - the admin just has to sign in again.
        if (/^40[13]/.test(reason)) {
          setErrorMsg(
            isRu
              ? 'Сессия администратора истекла — выйдите и войдите заново.'
              : 'Admin session expired - sign out and sign in again.',
          );
          return;
        }
        setErrorMsg(
          (isRu ? 'Не удалось загрузить аналитику' : 'Error loading analytics') + (reason ? ` (${reason})` : ''),
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchSummary, [days, token]);

  // Chart scale: a rounded ceiling above the busiest day, so the axis reads 0 / 25 / 50
  // instead of 0 / 23 / 46.
  const chartMax = useMemo(() => {
    const peak = Math.max(1, ...(data?.daily || []).map((day) => day.visitors));
    const magnitude = 10 ** Math.floor(Math.log10(peak));
    const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= peak / 2) || magnitude;
    return Math.ceil(peak / step) * step;
  }, [data]);

  const dayLabel = (date: string) => {
    const parsed = new Date(`${date}T00:00:00`);
    return parsed.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  };

  const fullDayLabel = (date: string) => {
    const parsed = new Date(`${date}T00:00:00`);
    return parsed.toLocaleDateString(locale, { day: 'numeric', month: 'long', weekday: 'short' });
  };

  // Signed change against the previous period of the same length. Growth is good for every
  // number on this screen, so up is always green.
  const delta = (current: number, previous: number) => {
    if (!previous) return current > 0 ? { percent: 100, positive: true } : null;
    const percent = ((current - previous) / previous) * 100;
    if (Math.abs(percent) < 0.5) return null;
    return { percent, positive: percent > 0 };
  };

  const conversion = data && data.totals.visits > 0 ? (data.totals.orders / data.totals.visits) * 100 : 0;

  const tile = (
    key: string,
    icon: ReactNode,
    label: string,
    value: number,
    previous: number,
    footnote: string,
  ) => {
    const change = delta(value, previous);
    return (
      <div key={key} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs space-y-2" id={`analytics-tile-${key}`}>
        <div className="flex items-center gap-2 text-slate-400">
          {icon}
          <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <span className="text-3xl font-black text-slate-900 leading-none tracking-tight">{formatNumber(value)}</span>
          {change && (
            <span
              className={`inline-flex items-center gap-0.5 text-[11px] font-extrabold ${
                change.positive ? 'text-emerald-600' : 'text-rose-500'
              }`}
            >
              {change.positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(Math.round(change.percent))}%
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 font-semibold">{footnote}</p>
      </div>
    );
  };

  // Breakdown card: a name, a count and a share bar. One hue throughout - the bar encodes
  // "how much", never identity, so there is nothing to look up in a legend.
  const breakdownCard = (
    id: string,
    icon: ReactNode,
    title: string,
    rows: { key: string; label: string; value: number; hint?: string }[],
    emptyText: string,
  ) => {
    const peak = Math.max(1, ...rows.map((row) => row.value));
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs" id={`analytics-${id}`}>
        <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2 mb-4">
          <span className="text-slate-400">{icon}</span>
          {title}
        </h4>
        {rows.length > 0 ? (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-bold text-slate-700 truncate">{row.label}</span>
                  <span className="text-xs font-black text-slate-900 shrink-0">
                    {formatNumber(row.value)}
                    {row.hint && <span className="text-[10px] font-semibold text-slate-400 ms-1.5">{row.hint}</span>}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-nadeck-600" style={{ width: `${Math.max(3, (row.value / peak) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-slate-400 font-semibold py-4 text-center">{emptyText}</p>
        )}
      </div>
    );
  };

  const breakdownRows = (rows: AnalyticsBreakdown[], label: (key: string) => string) =>
    rows.map((row) => ({ key: row.key, label: label(row.key), value: row.visitors }));

  return (
    <div className="space-y-5" id="view-admin-analytics">
      {/* Period, storefront and the live counter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-white rounded-2xl border border-slate-100 p-1 shadow-xs" id="analytics-period-switch">
          {PERIODS.map((period) => (
            <button
              key={period}
              id={`analytics-period-${period}`}
              onClick={() => setDays(period)}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-colors ${
                days === period ? 'bg-nadeck-600 text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isRu ? `${period} дней` : `${period} days`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-extrabold"
            id="analytics-online"
            title={isRu ? 'Посетители, открывавшие страницу за последние 5 минут' : 'Visitors active in the last 5 minutes'}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {isRu ? 'Сейчас на сайте:' : 'Online now:'} {data ? formatNumber(data.online) : '—'}
          </span>

          <button
            id="analytics-refresh"
            onClick={fetchSummary}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 transition"
            title={isRu ? 'Обновить' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-700 flex items-center gap-2" id="analytics-error">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading && !data ? (
        <div className="py-16 text-center text-slate-400 text-xs font-semibold" id="analytics-loading">
          <div className="w-8 h-8 rounded-full border-2 border-nadeck-600 border-t-transparent animate-spin mx-auto mb-3" />
          {isRu ? 'Считаем посещения...' : 'Crunching the numbers...'}
        </div>
      ) : data ? (
        <>
          {/* Headline counts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3" id="analytics-tiles">
            {tile(
              'visitors',
              <Users className="w-4 h-4" />,
              isRu ? 'Человек зашло' : 'People',
              data.totals.visitors,
              data.previous.visitors,
              isRu ? `сегодня: ${formatNumber(data.today.visitors)}` : `today: ${formatNumber(data.today.visitors)}`,
            )}
            {tile(
              'visits',
              <MousePointerClick className="w-4 h-4" />,
              isRu ? 'Визитов' : 'Visits',
              data.totals.visits,
              data.previous.visits,
              isRu ? `сегодня: ${formatNumber(data.today.visits)}` : `today: ${formatNumber(data.today.visits)}`,
            )}
            {tile(
              'views',
              <Eye className="w-4 h-4" />,
              isRu ? 'Просмотров страниц' : 'Page views',
              data.totals.pageViews,
              data.previous.pageViews,
              data.totals.visits > 0
                ? isRu
                  ? `${(data.totals.pageViews / data.totals.visits).toFixed(1)} за визит`
                  : `${(data.totals.pageViews / data.totals.visits).toFixed(1)} per visit`
                : '—',
            )}
            {tile(
              'orders',
              <ShoppingBag className="w-4 h-4" />,
              isRu ? 'Заказов' : 'Orders',
              data.totals.orders,
              data.previous.orders,
              isRu ? `конверсия ${conversion.toFixed(1)}% от визитов` : `${conversion.toFixed(1)}% of visits convert`,
            )}
          </div>

          {/* Daily visitors. One series, so the title carries the identity and the column
              tooltip carries every other number for that day. */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-xs" id="analytics-chart-card">
            <div className="flex items-baseline justify-between gap-3 mb-5 flex-wrap">
              <h4 className="text-sm font-extrabold text-slate-900">
                {isRu ? 'Посетители по дням' : 'Visitors per day'}
              </h4>
              <span className="text-[11px] text-slate-400 font-semibold">
                {isRu
                  ? 'Наведите на столбец — покажет визиты, просмотры и заказы'
                  : 'Hover a column for visits, views and orders'}
              </span>
            </div>

            <div className="relative pt-6" id="analytics-chart">
              {/* Recessive gridlines with the values the columns aren't labelled with */}
              <div className="relative h-56 ms-11">
                {[1, 0.5, 0].map((fraction) => (
                  <div
                    key={fraction}
                    className="absolute inset-x-0 flex items-center"
                    style={{ bottom: `${fraction * 100}%` }}
                  >
                    <span className="absolute -start-11 -translate-y-1/2 text-[10px] font-bold text-slate-400 tabular-nums">
                      {formatNumber(chartMax * fraction)}
                    </span>
                    <div className="w-full h-px bg-slate-100" />
                  </div>
                ))}

                {/* Columns: 2px of surface between neighbours, capped width so a short
                    period doesn't blow the bars up into blocks. The tooltip is rendered
                    inside its own column rather than positioned by percentage, because the
                    Arabic admin reads this page right-to-left and the row is mirrored. */}
                <div className="absolute inset-0 flex items-end gap-[2px]">
                  {data.daily.map((day, index) => (
                    <div
                      key={day.date}
                      className="relative flex-1 min-w-0 h-full flex items-end justify-center cursor-default"
                      onMouseEnter={() => setHoveredDay(index)}
                      onMouseLeave={() => setHoveredDay((current) => (current === index ? null : current))}
                    >
                      <div
                        className={`w-full max-w-[24px] rounded-t-[4px] transition-colors ${
                          hoveredDay === index ? 'bg-nadeck-500' : 'bg-nadeck-600'
                        }`}
                        style={{ height: `${Math.max(day.visitors > 0 ? 2 : 0, (day.visitors / chartMax) * 100)}%` }}
                      />

                      {hoveredDay === index && (
                        <div
                          className={`absolute bottom-full mb-2 z-10 pointer-events-none bg-slate-900 text-white rounded-xl px-3 py-2 shadow-lg whitespace-nowrap ${
                            // Days at either end would hang off the card, so their tooltip
                            // is anchored to the edge it can't overflow.
                            index < data.daily.length / 6
                              ? 'start-0'
                              : index > data.daily.length - 1 - data.daily.length / 6
                                ? 'end-0'
                                : 'start-1/2 -translate-x-1/2'
                          }`}
                        >
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                            {fullDayLabel(day.date)}
                          </p>
                          <p className="text-[11px] font-bold mt-0.5">
                            {isRu ? 'человек' : 'people'}: {formatNumber(day.visitors)} ·{' '}
                            {isRu ? 'визитов' : 'visits'}: {formatNumber(day.visits)}
                          </p>
                          <p className="text-[11px] font-bold text-slate-300">
                            {isRu ? 'просмотров' : 'views'}: {formatNumber(day.pageViews)} ·{' '}
                            {isRu ? 'заказов' : 'orders'}: {formatNumber(day.orders)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Roughly six date labels, so they never collide on a 90-day range */}
              <div className="flex gap-[2px] ms-11 mt-2">
                {data.daily.map((day, index) => {
                  const every = Math.max(1, Math.ceil(data.daily.length / 6));
                  const shown = index % every === 0 || index === data.daily.length - 1;
                  return (
                    <div key={day.date} className="flex-1 min-w-0 text-center">
                      {shown && <span className="text-[9px] font-bold text-slate-400 tabular-nums">{dayLabel(day.date)}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* What they looked at and where they came from */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs" id="analytics-top-products">
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2 mb-4">
                <span className="text-slate-400"><Eye className="w-4 h-4" /></span>
                {isRu ? 'Самые просматриваемые товары' : 'Most viewed products'}
              </h4>
              {data.topProducts.length > 0 ? (
                <ul className="space-y-2.5">
                  {data.topProducts.map((product, index) => (
                    <li key={product.id} className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-300 w-4 shrink-0 tabular-nums">{index + 1}</span>
                      {product.image ? (
                        <img src={product.image} alt="" className="w-9 h-9 rounded-lg object-cover bg-slate-50 border border-slate-100 shrink-0" />
                      ) : (
                        <span className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-slate-700 truncate flex-1 min-w-0">
                        {product.name?.[currentLang] || product.name?.en || product.id}
                      </span>
                      <span className="text-xs font-black text-slate-900 shrink-0">
                        {formatNumber(product.views)}
                        <span className="text-[10px] font-semibold text-slate-400 ms-1.5">
                          {isRu ? `${formatNumber(product.visitors)} чел.` : `${formatNumber(product.visitors)} ppl`}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-slate-400 font-semibold py-4 text-center">
                  {isRu ? 'Карточки товаров пока не открывали' : 'No product pages opened yet'}
                </p>
              )}
            </div>

            {breakdownCard(
              'referrers',
              <Compass className="w-4 h-4" />,
              isRu ? 'Откуда приходят' : 'Traffic sources',
              data.referrers.map((row) => ({
                key: row.source,
                label: row.source === 'direct' ? (isRu ? 'Прямые заходы и закладки' : 'Direct & bookmarks') : row.source,
                value: row.visits,
                hint: isRu ? 'визитов' : 'visits',
              })),
              isRu ? 'Пока нет данных' : 'No data yet',
            )}

            {breakdownCard(
              'countries',
              <Globe className="w-4 h-4" />,
              isRu ? 'Страны' : 'Countries',
              data.countries.map((row) => ({
                key: row.key,
                label: row.key === 'unknown' ? (isRu ? '🌐 Не определена' : '🌐 Unknown') : `${flagOf(row.key)} ${row.key}`,
                value: row.visitors,
                hint: isRu ? 'чел.' : 'ppl',
              })),
              // Cloudflare stamps the country on the request; a local dev server doesn't.
              isRu ? 'Страна приходит от Cloudflare — на локальном сервере её нет' : 'Country comes from Cloudflare — absent on a local server',
            )}

            {breakdownCard(
              'pages',
              <Layers className="w-4 h-4" />,
              isRu ? 'Разделы сайта' : 'Site sections',
              breakdownRows(data.topPages, (key) => (isRu ? PATH_LABELS[key]?.ru : PATH_LABELS[key]?.en) || key),
              isRu ? 'Пока нет данных' : 'No data yet',
            )}

            {breakdownCard(
              'devices',
              <Smartphone className="w-4 h-4" />,
              isRu ? 'Устройства' : 'Devices',
              breakdownRows(data.devices, (key) => (isRu ? DEVICE_LABELS[key]?.ru : DEVICE_LABELS[key]?.en) || key),
              isRu ? 'Пока нет данных' : 'No data yet',
            )}

            {breakdownCard(
              'languages',
              <LanguagesIcon className="w-4 h-4" />,
              isRu ? 'Язык интерфейса' : 'Interface language',
              breakdownRows(data.languages, (key) =>
                key === 'ru' || key === 'en' ? LANGUAGE_NAME_TRANSLATIONS[key][currentLang] : key || (isRu ? 'Не указан' : 'Unknown'),
              ),
              isRu ? 'Пока нет данных' : 'No data yet',
            )}
          </div>

          {data.totals.pageViews === 0 && (
            <div className="py-10 text-center bg-white rounded-3xl border border-dashed border-slate-200" id="analytics-empty">
              <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">
                {isRu ? 'За этот период посещений не было' : 'No visits in this period'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {isRu
                  ? 'Счётчик считает посетителей с момента установки этого обновления, а заходы администраторов не учитываются — поэтому сразу после релиза здесь пусто.'
                  : 'Counting starts with this release and admins are deliberately excluded, so the first hours look empty.'}
              </p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
