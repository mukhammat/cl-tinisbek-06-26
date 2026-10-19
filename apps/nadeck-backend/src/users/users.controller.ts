/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { UsersService } from './users.service';

@UseGuards(AdminGuard)
@Controller('api/admin/users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.list();
  }
}
