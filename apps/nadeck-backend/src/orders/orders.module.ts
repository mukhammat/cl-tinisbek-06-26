import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';

@Module({
  imports: [DatabaseModule, AuthModule, PromoCodesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
