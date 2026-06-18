/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('auth/register')
  @HttpCode(HttpStatus.OK)
  register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: any) {
    return this.authService.login(body);
  }

  @Post('profile')
  @HttpCode(HttpStatus.OK)
  updateProfile(@Body() body: any) {
    return this.authService.updateProfile(body);
  }
}
