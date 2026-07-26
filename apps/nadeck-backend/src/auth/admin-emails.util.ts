/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const ADMIN_EMAILS = new Set(['dosnet2200@gmail.com', 'admin@example.com']);

// Scoped admins: full admin rights, but only over products listed on this one market (see
// Product.markets / User.adminMarket) - a separate account from the ADMIN_EMAILS above, which
// keeps access to every market.
const AR_ADMIN_EMAILS = new Set(['arar@gmail.com']);

export function isAdminEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return ADMIN_EMAILS.has(lower) || lower.endsWith('@admin.com') || AR_ADMIN_EMAILS.has(lower);
}

// null = full admin (every market); a specific market confines the account to that
// storefront's products only.
export function getAdminMarket(email: string): 'main' | 'ar' | null {
  return AR_ADMIN_EMAILS.has(email.toLowerCase()) ? 'ar' : null;
}
