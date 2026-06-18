/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { MedicinesModule } from './medicines/medicines.module';
import { OrdersModule } from './orders/orders.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    MedicinesModule,
    OrdersModule,
    ChatModule,
  ],
})
export class AppModule {}
