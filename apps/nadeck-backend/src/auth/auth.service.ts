/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Inject, Injectable, BadRequestException, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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

      const user = await this.prisma.user.create({
        data: {
          email: emailLower,
          password,
          fullName,
          phone: phone || '',
          address: address || '',
        },
      });

      return {
        email: user.email,
        fullName: user.fullName,
        phone: user.phone || '',
        address: user.address || '',
        isAuthenticated: true,
      };
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
      if (!user || user.password !== password) {
        throw new UnauthorizedException('Invalid email or password');
      }

      return {
        email: user.email,
        fullName: user.fullName,
        phone: user.phone || '',
        address: user.address || '',
        isAuthenticated: true,
      };
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
}
