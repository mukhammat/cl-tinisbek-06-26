/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Inject, Injectable, BadRequestException, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { createHash, randomInt } from 'crypto';
import { isAdminEmail } from './admin-emails.util';
import { MailService } from '../mail/mail.service';

const BCRYPT_ROUNDS = 10;
const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

// Only a hash of the code is stored; the email is mixed in so equal codes don't look equal.
const hashCode = (email: string, code: string) => createHash('sha256').update(`${email}:${code}`).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  private buildAuthResponse(user: { email: string; fullName: string; phone: string | null; address: string | null; isAdmin: boolean; emailVerified: boolean }) {
    const token = this.jwtService.sign({ email: user.email, isAdmin: user.isAdmin });

    return {
      email: user.email,
      fullName: user.fullName,
      phone: user.phone || '',
      address: user.address || '',
      isAuthenticated: true,
      isAdmin: user.isAdmin,
      emailVerified: user.emailVerified,
      token,
    };
  }

  async register(body: any) {
    const { email, password, fullName, phone, address } = body;
    if (!email || !password || !fullName) {
      throw new BadRequestException('Missing required registration info');
    }

    try {
      const emailLower = email.toLowerCase();
      const existing = await this.prisma.user.findUnique({
        where: { email: emailLower },
      });
      if (existing) {
        throw new BadRequestException('User with this email already exists');
      }

      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = await this.prisma.user.create({
        data: {
          email: emailLower,
          password: hashedPassword,
          fullName,
          phone: phone || '',
          address: address || '',
          isAdmin: isAdminEmail(emailLower),
        },
      });

      // The account works either way - verification only marks it - so a mail outage must not
      // turn into a failed registration. The customer can ask for a new code from the profile.
      await this.sendVerificationCode(emailLower).catch((err) => console.error('Verification mail error:', err));

      return this.buildAuthResponse(user);
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      console.error('Register service error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async login(body: any) {
    const { email, password } = body;
    if (!email || !password) {
      throw new BadRequestException('Missing email or password credentials');
    }

    try {
      const emailLower = email.toLowerCase();
      const user = await this.prisma.user.findUnique({
        where: { email: emailLower },
      });
      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Passwords created before bcrypt hashing was introduced are stored in plaintext.
      // Accept them once, then transparently upgrade to a bcrypt hash so every login
      // after this one goes through the normal hashed-compare path.
      const isBcryptHash = user.password.startsWith('$2');
      const passwordMatches = isBcryptHash
        ? await bcrypt.compare(password, user.password)
        : user.password === password;

      if (!passwordMatches) {
        throw new UnauthorizedException('Invalid email or password');
      }

      if (!isBcryptHash) {
        const upgradedHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await this.prisma.user.update({
          where: { email: emailLower },
          data: { password: upgradedHash },
        });
      }

      // isAdmin is stamped at registration, so an account created under a rule that has since
      // been dropped would keep it forever - re-derive it from the allowlist on every login.
      const isAdmin = isAdminEmail(emailLower);
      if (user.isAdmin !== isAdmin) {
        const synced = await this.prisma.user.update({
          where: { email: emailLower },
          data: { isAdmin },
        });
        return this.buildAuthResponse(synced);
      }

      return this.buildAuthResponse(user);
    } catch (err: any) {
      if (err instanceof UnauthorizedException || err instanceof BadRequestException) throw err;
      console.error('Login service error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async updateProfile(body: any) {
    const { email, fullName, phone, address } = body;
    if (!email) {
      throw new BadRequestException('Email parameter is required');
    }

    try {
      const emailLower = email.toLowerCase();
      const user = await this.prisma.user.findUnique({
        where: { email: emailLower },
      });
      if (!user) {
        throw new NotFoundException('User profile not found');
      }

      const updated = await this.prisma.user.update({
        where: { email: emailLower },
        data: {
          fullName: fullName || user.fullName,
          phone: phone !== undefined ? phone : user.phone,
          address: address !== undefined ? address : user.address,
        },
      });

      return {
        email: updated.email,
        fullName: updated.fullName,
        phone: updated.phone || '',
        address: updated.address || '',
        isAuthenticated: true,
      };
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      console.error('Profile update service error:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  // Mails a fresh 6-digit code to an account that hasn't confirmed its address yet. A new code
  // replaces the previous one and resets the attempt counter.
  async sendVerificationCode(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User profile not found');
    if (user.emailVerified) return { emailVerified: true, sent: false };

    if (user.verifyCodeSentAt && Date.now() - Date.parse(user.verifyCodeSentAt) < RESEND_COOLDOWN_MS) {
      throw new BadRequestException('Код уже отправлен, новый можно запросить через минуту');
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const now = Date.now();
    await this.prisma.user.update({
      where: { email },
      data: {
        verifyCode: hashCode(email, code),
        verifyCodeExpiresAt: new Date(now + CODE_TTL_MS).toISOString(),
        verifyCodeSentAt: new Date(now).toISOString(),
        verifyAttempts: 0,
      },
    });

    await this.mail.send({
      to: email,
      subject: `${code} — код подтверждения Nadeck`,
      text: `Ваш код подтверждения почты на nadeck.net: ${code}\nОн действует 15 минут.\n\nYour nadeck.net email confirmation code: ${code} (valid for 15 minutes).\n\nЕсли вы не регистрировались на nadeck.net, просто проигнорируйте это письмо.`,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0f172a;line-height:1.5">
  <p>Ваш код подтверждения почты на <b>nadeck.net</b>:</p>
  <p style="font-size:30px;font-weight:bold;letter-spacing:6px;margin:16px 0">${code}</p>
  <p>Код действует 15 минут.</p>
  <p style="color:#64748b">Your nadeck.net email confirmation code — valid for 15 minutes.</p>
  <p style="color:#94a3b8;font-size:13px">Если вы не регистрировались на nadeck.net, просто проигнорируйте это письмо.</p>
</div>`,
    });

    return { emailVerified: false, sent: true };
  }

  async verifyEmail(email: string, code: unknown) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User profile not found');
    if (user.emailVerified) return { emailVerified: true };

    if (!user.verifyCode || !user.verifyCodeExpiresAt || Date.parse(user.verifyCodeExpiresAt) < Date.now()) {
      throw new BadRequestException('Код истёк, запросите новый');
    }
    if (user.verifyAttempts >= MAX_CODE_ATTEMPTS) {
      throw new BadRequestException('Слишком много попыток, запросите новый код');
    }

    const entered = String(code ?? '').replace(/\D/g, '');
    if (entered.length !== 6 || hashCode(email, entered) !== user.verifyCode) {
      await this.prisma.user.update({ where: { email }, data: { verifyAttempts: { increment: 1 } } });
      throw new BadRequestException('Неверный код');
    }

    await this.prisma.user.update({
      where: { email },
      data: { emailVerified: true, verifyCode: null, verifyCodeExpiresAt: null, verifyAttempts: 0 },
    });
    return { emailVerified: true };
  }
}
