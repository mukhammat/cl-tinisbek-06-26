/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { isAdminEmail } from './admin-emails.util';

// Routes keyed by an email in the path only serve that account's owner (or an admin) - without
// this, knowing someone's address was enough to read their orders, phone and delivery address.
@Injectable()
export class OwnEmailGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);

    const request = context.switchToHttp().getRequest();
    const ownEmail = String(request.user?.email ?? '').toLowerCase();
    const isAdmin = !!request.user?.isAdmin && isAdminEmail(ownEmail);
    if (!isAdmin && String(request.params?.email ?? '').toLowerCase() !== ownEmail) {
      throw new ForbiddenException('Access to another account is not allowed');
    }
    return true;
  }
}
