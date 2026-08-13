/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type MarketScope = 'main' | 'ar' | undefined;

// The screens the storefront reports. Anything else is filed under 'other' rather than
// trusted verbatim, so a malformed or hand-crafted request can't invent rows in the table.
const KNOWN_PATHS = new Set(['catalog', 'product', 'calculator', 'cart', 'orders', 'checkout']);

// Crawlers aren't people, and the dashboard's whole job is counting people. Googlebot still
// gets the page - it just doesn't get counted.
const BOT_PATTERN =
  /(bot|crawl|spider|slurp|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|scrapy|semrush|ahrefs)/i;

// Our own hosts are not a traffic source - arriving from them is just moving around the site.
const OWN_HOSTS = ['nadeck.net', 'ar.nadeck.net', 'localhost'];

const MIN_DAYS = 1;
const MAX_DAYS = 365;
const DEFAULT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
// "Online now" is the industry-standard 5-minute window: someone whose last page view was
// within it is still reading.
const ONLINE_WINDOW_MS = 5 * 60 * 1000;
// Views older than this are dropped - the table gains a row per page view, and nobody asks
// what happened more than a year ago.
const RETENTION_DAYS = 400;

interface TrackedEvent {
  visitorId: string;
  sessionId: string;
  path: string;
  productId: string | null;
  referrer: string;
  lang: string;
  device: string;
  country: string;
  createdAt: Date;
}

@Injectable()
export class AnalyticsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Last time old rows were swept, so the sweep runs about once a day instead of per request.
  private lastPruneAt = 0;

  // ----- writing -----

  /**
   * Records one page view. Always resolves - a visitor's page must never break because the
   * counter did, so every failure is swallowed and reported as `{ ok: false }`.
   */
  async track(body: any, headers: Record<string, any>) {
    const userAgent = String(headers['user-agent'] || '');
    if (BOT_PATTERN.test(userAgent)) return { ok: false as const, reason: 'bot' };

    const visitorId = this.trim(body?.visitorId, 64);
    const sessionId = this.trim(body?.sessionId, 64);
    // Both ids are minted by the browser; without them a row can't be counted as a person
    // or a visit, which is all this table is for.
    if (!visitorId || !sessionId) return { ok: false as const, reason: 'invalid' };

    const path = KNOWN_PATHS.has(body?.path) ? String(body.path) : 'other';

    try {
      await this.prisma.visitEvent.create({
        data: {
          visitorId,
          sessionId,
          market: body?.market === 'ar' ? 'ar' : 'main',
          path,
          productId: path === 'product' ? this.trim(body?.productId, 64) || null : null,
          referrer: this.normalizeReferrer(body?.referrer),
          lang: this.trim(body?.lang, 8).toLowerCase(),
          device: this.deviceFrom(userAgent),
          country: this.countryFrom(headers),
        },
      });

      this.pruneOldEvents();
      return { ok: true as const };
    } catch (err) {
      console.error('Track visit error:', err);
      return { ok: false as const, reason: 'error' };
    }
  }

  private trim(value: unknown, maxLength: number): string {
    return String(value ?? '').trim().slice(0, maxLength);
  }

  // Keeps only the host ("instagram.com"), because that is the question the sources table
  // answers - which site sent them - and a full URL would carry query parameters we don't want.
  private normalizeReferrer(value: unknown): string {
    const raw = this.trim(value, 300);
    if (!raw) return '';
    try {
      const host = new URL(raw).hostname.replace(/^www\./, '').toLowerCase();
      return OWN_HOSTS.includes(host) ? '' : host.slice(0, 100);
    } catch {
      return '';
    }
  }

  private deviceFrom(userAgent: string): string {
    if (/ipad|tablet|playbook|silk/i.test(userAgent)) return 'tablet';
    if (/mobi|android|iphone|ipod/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  // Cloudflare terminates TLS in front of the origin (see nginx.conf) and stamps the visitor's
  // country on the request, so the country comes for free without ever storing an IP address.
  private countryFrom(headers: Record<string, any>): string {
    const code = String(headers['cf-ipcountry'] || '').toUpperCase();
    // XX = unknown, T1 = Tor - neither names a country.
    if (!/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'T1') return '';
    return code;
  }

  private pruneOldEvents() {
    const now = Date.now();
    if (now - this.lastPruneAt < DAY_MS) return;
    this.lastPruneAt = now;

    this.prisma.visitEvent
      .deleteMany({ where: { createdAt: { lt: new Date(now - RETENTION_DAYS * DAY_MS) } } })
      .catch((err) => console.error('Prune visit events error:', err));
  }

  // ----- reading (admin dashboard) -----

  /**
   * Everything the dashboard shows for the last `days` days, plus the same figures for the
   * period right before it so each tile can show whether things are going up or down.
   *
   * `market` is the storefront to report on (undefined = both, which is what a full admin
   * sees by default). `tzOffsetMinutes` is the admin's own UTC offset, so "today" ends at
   * their midnight rather than UTC's.
   */
  async summary(options: { days?: unknown; market?: MarketScope; tzOffsetMinutes?: unknown }) {
    const days = this.clamp(Math.round(Number(options.days) || DEFAULT_DAYS), MIN_DAYS, MAX_DAYS);
    // ±14h covers every real zone; anything else is a broken client, not a place.
    const offsetMinutes = this.clamp(Math.round(Number(options.tzOffsetMinutes) || 0), -840, 840);
    const offsetMs = offsetMinutes * 60 * 1000;
    const market = options.market;

    // A "day" is a day in the admin's timezone: shift the instant, then cut the date off it.
    const dayKeyOf = (date: Date) => new Date(date.getTime() + offsetMs).toISOString().slice(0, 10);

    const now = new Date();
    const todayKey = dayKeyOf(now);
    // Local midnight of the first day in the period, expressed as a real (UTC) instant again.
    const todayStartMs = Date.parse(`${todayKey}T00:00:00.000Z`) - offsetMs;
    const periodStart = new Date(todayStartMs - (days - 1) * DAY_MS);
    const previousStart = new Date(periodStart.getTime() - days * DAY_MS);

    try {
      const [events, orders] = await Promise.all([
        this.prisma.visitEvent.findMany({
          // Both periods in one read: the previous one only feeds the "vs previous period" deltas.
          where: { createdAt: { gte: previousStart }, ...(market ? { market } : {}) },
          select: {
            visitorId: true,
            sessionId: true,
            path: true,
            productId: true,
            referrer: true,
            lang: true,
            device: true,
            country: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
        // Orders are stored with a ru-RU date string and no timestamp, so they can't be
        // range-filtered in SQL - the whole (small) table is read and bucketed by day here.
        this.prisma.order.findMany({
          where: market ? { market } : {},
          select: { date: true, market: true, totalPrice: true, totalPriceUsd: true, totalPriceSar: true },
        }),
      ]);

      const current = events.filter((event) => event.createdAt >= periodStart);
      const previous = events.filter((event) => event.createdAt < periodStart);

      // Every day in the range, including the ones nobody visited - a gap in the chart would
      // otherwise read as "no data" instead of "no visitors".
      const dayKeys: string[] = [];
      for (let index = 0; index < days; index += 1) {
        dayKeys.push(new Date(todayStartMs - (days - 1 - index) * DAY_MS + offsetMs).toISOString().slice(0, 10));
      }
      const inPeriod = new Set(dayKeys);

      const ordersByDay = new Map<string, { count: number; kzt: number; usd: number; sar: number }>();
      for (const order of orders) {
        const key = this.orderDayKey(order.date);
        if (!key) continue;
        const bucket = ordersByDay.get(key) || { count: 0, kzt: 0, usd: 0, sar: 0 };
        bucket.count += 1;
        bucket.kzt += order.totalPrice || 0;
        bucket.usd += order.totalPriceUsd || 0;
        bucket.sar += order.totalPriceSar || 0;
        ordersByDay.set(key, bucket);
      }

      const eventsByDay = new Map<string, TrackedEvent[]>();
      for (const event of current) {
        const key = dayKeyOf(event.createdAt);
        const bucket = eventsByDay.get(key);
        if (bucket) bucket.push(event);
        else eventsByDay.set(key, [event]);
      }

      const daily = dayKeys.map((date) => {
        const dayEvents = eventsByDay.get(date) || [];
        const dayOrders = ordersByDay.get(date);
        return {
          date,
          visitors: new Set(dayEvents.map((event) => event.visitorId)).size,
          visits: new Set(dayEvents.map((event) => event.sessionId)).size,
          pageViews: dayEvents.length,
          orders: dayOrders?.count || 0,
        };
      });

      // The previous period's orders sit in the days right before the range.
      const previousDayKeys = new Set(
        Array.from({ length: days }, (_unused, index) =>
          new Date(previousStart.getTime() + index * DAY_MS + offsetMs).toISOString().slice(0, 10),
        ),
      );

      const currentOrders = this.sumOrders(ordersByDay, (key) => inPeriod.has(key));
      const previousOrders = this.sumOrders(ordersByDay, (key) => previousDayKeys.has(key));
      const todayEvents = eventsByDay.get(todayKey) || [];

      const onlineSince = new Date(now.getTime() - ONLINE_WINDOW_MS);
      const online = new Set(
        current.filter((event) => event.createdAt >= onlineSince).map((event) => event.visitorId),
      ).size;

      return {
        days,
        market: market ?? null,
        generatedAt: now.toISOString(),
        online,
        totals: { ...this.countPeople(current), ...currentOrders },
        previous: { ...this.countPeople(previous), ...previousOrders },
        today: {
          ...this.countPeople(todayEvents),
          orders: ordersByDay.get(todayKey)?.count || 0,
        },
        daily,
        topProducts: await this.topProducts(current),
        topPages: this.groupBy(current, (event) => event.path).slice(0, 8),
        referrers: this.referrerSources(current),
        devices: this.groupBy(current, (event) => event.device),
        languages: this.groupBy(current, (event) => event.lang || 'unknown').slice(0, 6),
        countries: this.groupBy(current, (event) => event.country || 'unknown').slice(0, 10),
      };
    } catch (err) {
      console.error('Analytics summary error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  private clamp(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
  }

  // People, visits and views for a slice of events - the three headline numbers, always
  // counted the same way so a tile and a chart column can never disagree.
  private countPeople(events: TrackedEvent[]) {
    const visitors = new Set(events.map((event) => event.visitorId)).size;
    const visits = new Set(events.map((event) => event.sessionId)).size;
    return { visitors, visits, pageViews: events.length };
  }

  private sumOrders(byDay: Map<string, { count: number; kzt: number; usd: number; sar: number }>, keep: (key: string) => boolean) {
    let orders = 0;
    let revenueKzt = 0;
    let revenueUsd = 0;
    let revenueSar = 0;
    for (const [key, bucket] of byDay) {
      if (!keep(key)) continue;
      orders += bucket.count;
      revenueKzt += bucket.kzt;
      revenueUsd += bucket.usd;
      revenueSar += bucket.sar;
    }
    return { orders, revenueKzt, revenueUsd, revenueSar };
  }

  // Orders carry a ru-RU date ("11.08.2026") written at checkout, not a timestamp - see
  // OrdersService.placeOrder. Day precision is all the dashboard needs from them.
  private orderDayKey(date: string): string | null {
    const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(date || '').trim());
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;

    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
  }

  // Distinct people per value, biggest first - used for pages, devices, languages, countries.
  private groupBy(events: TrackedEvent[], pick: (event: TrackedEvent) => string) {
    const byKey = new Map<string, { views: number; visitors: Set<string> }>();
    for (const event of events) {
      const key = pick(event);
      const bucket = byKey.get(key) || { views: 0, visitors: new Set<string>() };
      bucket.views += 1;
      bucket.visitors.add(event.visitorId);
      byKey.set(key, bucket);
    }

    return Array.from(byKey, ([key, bucket]) => ({ key, views: bucket.views, visitors: bucket.visitors.size }))
      .sort((left, right) => right.visitors - left.visitors || right.views - left.views);
  }

  /**
   * Where visits came from, counted once per visit rather than per page view: the referrer
   * of the page someone landed on is what brought them, and every click after that is
   * internal navigation carrying the same value.
   */
  private referrerSources(events: TrackedEvent[]) {
    const firstOfSession = new Map<string, string>();
    // `events` arrives oldest-first, so the first row seen for a session is its landing page.
    for (const event of events) {
      if (!firstOfSession.has(event.sessionId)) firstOfSession.set(event.sessionId, event.referrer);
    }

    const byHost = new Map<string, number>();
    for (const referrer of firstOfSession.values()) {
      const key = referrer || 'direct';
      byHost.set(key, (byHost.get(key) || 0) + 1);
    }

    return Array.from(byHost, ([source, visits]) => ({ source, visits }))
      .sort((left, right) => right.visits - left.visits)
      .slice(0, 10);
  }

  // The most looked-at products, with their names resolved so the table reads like the
  // catalog does. Products deleted since the view still show their id rather than vanishing.
  private async topProducts(events: TrackedEvent[]) {
    const viewed = events.filter((event) => event.productId);
    if (viewed.length === 0) return [];

    const ranked = this.groupBy(viewed, (event) => event.productId as string).slice(0, 10);
    const products = await this.prisma.product.findMany({
      where: { id: { in: ranked.map((row) => row.key) } },
      select: { id: true, name: true, images: true, imagesAr: true },
    });
    const byId = new Map(products.map((product) => [product.id, product]));

    return ranked.map((row) => {
      const product = byId.get(row.key);
      const images = (product?.images as string[] | null) || [];
      const imagesAr = (product?.imagesAr as string[] | null) || [];
      return {
        id: row.key,
        name: (product?.name as Record<string, string> | undefined) || null,
        image: images[0] || imagesAr[0] || null,
        views: row.views,
        visitors: row.visitors,
      };
    });
  }
}
