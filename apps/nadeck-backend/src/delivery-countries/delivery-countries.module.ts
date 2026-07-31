import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { DeliveryCountriesController } from './delivery-countries.controller';
import { DeliveryCountriesService } from './delivery-countries.service';

@Module({
  // AuthModule supplies the JwtService that AdminGuard resolves on the admin routes.
  imports: [DatabaseModule, AuthModule],
  controllers: [DeliveryCountriesController],
  providers: [DeliveryCountriesService],
  // OrdersModule charges the fee from the database rather than the one the browser reports.
  exports: [DeliveryCountriesService],
})
export class DeliveryCountriesModule {}
