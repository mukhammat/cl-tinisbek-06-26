import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { MedicinesModule } from './medicines/medicines.module';
import { CategoriesModule } from './categories/categories.module';
import { OrdersModule } from './orders/orders.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TranslateModule } from './translate/translate.module';

@Module({
  imports: [DatabaseModule, AuthModule, ChatModule, MedicinesModule, CategoriesModule, OrdersModule, NotificationsModule, TranslateModule],
})
export class AppModule {}
