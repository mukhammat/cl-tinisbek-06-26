import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DatabaseModule } from '../database/database.module';
import { MailModule } from '../mail/mail.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { OwnEmailGuard } from './own-email.guard';

@Module({
  imports: [
    DatabaseModule,
    MailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AdminGuard, OwnEmailGuard],
  exports: [JwtModule, JwtAuthGuard, AdminGuard, OwnEmailGuard],
})
export class AuthModule {}
