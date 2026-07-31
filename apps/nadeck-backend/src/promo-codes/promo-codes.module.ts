import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PromoCodesController } from './promo-codes.controller';
import { PromoCodesService } from './promo-codes.service';

@Module({
  // AuthModule supplies the JwtService that AdminGuard resolves on the admin routes below.
  imports: [DatabaseModule, AuthModule],
  controllers: [PromoCodesController],
  providers: [PromoCodesService],
  // OrdersModule applies the discount at checkout instead of trusting the total the browser sends.
  exports: [PromoCodesService],
})
export class PromoCodesModule {}
