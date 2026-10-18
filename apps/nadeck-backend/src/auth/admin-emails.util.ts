/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const ADMIN_EMAILS = new Set(['dosnet2200@gmail.com', 'admin@example.com']);

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.has(email.toLowerCase());
}
