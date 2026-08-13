/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MARKET } from './market';

/**
 * Site traffic counter for the admin dashboard ("how many people came").
 *
 * Two ids are kept in the browser and sent with every screen the visitor opens:
 * - `visitorId` lives in localStorage and answers "how many people" - the same browser
 *   coming back next week is still one person.
 * - `sessionId` lives beside it with a last-seen stamp and lapses after 30 idle minutes,
 *   which is what makes one afternoon of browsing count as one visit.
 *
 * Nothing identifying leaves the browser: no email, no ad-network cookie, no IP (the server
 * stores only the country Cloudflare already puts on the request). Everything is
 * fire-and-forget - a blocked or failed request never disturbs the page.
 */

const VISITOR_KEY = 'nadeck_visitor_id';
const SESSION_KEY = 'nadeck_session';
const SESSION_IDLE_MS = 30 * 60 * 1000;

// Screens the dashboard knows how to name. Anything else the server files under "other".
export type TrackedPath = 'catalog' | 'product' | 'calculator' | 'cart' | 'orders' | 'checkout';

const randomId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

// Private-mode browsers and locked-down settings throw on storage access - the visit simply
// goes uncounted rather than taking the page down with it.
const readStorage = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable - this visit just isn't counted */
  }
};

const getVisitorId = (): string => {
  const saved = readStorage(VISITOR_KEY);
  if (saved) return saved;

  const created = randomId();
  writeStorage(VISITOR_KEY, created);
  return created;
};

// A visit is a stretch of browsing with no 30-minute gap in it, shared across the tabs the
// visitor has open (localStorage, not sessionStorage - two tabs are still one visit).
const getSessionId = (): string => {
  const now = Date.now();
  const saved = readStorage(SESSION_KEY);

  if (saved) {
    try {
      const session = JSON.parse(saved) as { id: string; lastSeen: number };
      if (session?.id && now - session.lastSeen < SESSION_IDLE_MS) {
        writeStorage(SESSION_KEY, JSON.stringify({ id: session.id, lastSeen: now }));
        return session.id;
      }
    } catch {
      /* malformed entry - start a fresh visit below */
    }
  }

  const created = randomId();
  writeStorage(SESSION_KEY, JSON.stringify({ id: created, lastSeen: now }));
  return created;
};

// React re-renders (and StrictMode's double effect in development) must not turn one screen
// into two page views, so the same screen within a second of itself is ignored.
let lastEvent = { key: '', at: 0 };

/**
 * Records that the visitor opened a screen. `productId` is only meaningful for `'product'`.
 * Admins are not counted - see the call site in App.tsx.
 */
export const trackView = (path: TrackedPath, options?: { productId?: string; lang?: string }) => {
  if (typeof window === 'undefined') return;

  const key = `${path}:${options?.productId || ''}`;
  const now = Date.now();
  if (lastEvent.key === key && now - lastEvent.at < 1000) return;
  lastEvent = { key, at: now };

  const body = JSON.stringify({
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    market: MARKET,
    path,
    productId: options?.productId,
    referrer: document.referrer,
    lang: options?.lang,
  });

  // keepalive so the request still goes out if the view change is the visitor leaving.
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    /* counting is never worth an error in the console the visitor might see */
  });
};
