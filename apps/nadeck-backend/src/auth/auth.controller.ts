/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Controller, Post, Body, HttpCode, HttpStatus, Inject, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

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

  // The account comes from the token, never from the body - otherwise anyone could rewrite
  // anyone's name, phone and address by posting their email.
  @UseGuards(JwtAuthGuard)
  @Post('profile')
  @HttpCode(HttpStatus.OK)
  updateProfile(@Body() body: any, @Req() req: any) {
    return this.authService.updateProfile({ ...body, email: req.user.email });
  }
}
