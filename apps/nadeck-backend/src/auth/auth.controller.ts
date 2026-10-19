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

  // The code mailed at registration; "send again" mails a new one (at most once a minute).
  @UseGuards(JwtAuthGuard)
  @Post('auth/verify-email/send')
  @HttpCode(HttpStatus.OK)
  sendVerificationCode(@Req() req: any) {
    return this.authService.sendVerificationCode(req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('auth/verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body('code') code: string, @Req() req: any) {
    return this.authService.verifyEmail(req.user.email, code);
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
