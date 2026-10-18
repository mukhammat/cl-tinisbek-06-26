/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { isAdminEmail } from './admin-emails.util';

@Injectable()
export class AdminGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);

    const request = context.switchToHttp().getRequest();
    // The allowlist is re-checked on every request, not just trusted from the token, so taking
    // an address off it revokes access right away instead of when its 7-day token expires.
    if (!request.user?.isAdmin || !isAdminEmail(request.user.email ?? '')) {
      throw new ForbiddenException('Administrator access required');
    }
    return true;
  }
}
