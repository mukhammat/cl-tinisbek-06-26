import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { MedicinesModule } from './medicines/medicines.module';
import { CategoriesModule } from './categories/categories.module';
import { OrdersModule } from './orders/orders.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { DeliveryCountriesModule } from './delivery-countries/delivery-countries.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TranslateModule } from './translate/translate.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { UploadModule } from './upload/upload.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DialogsModule } from './dialogs/dialogs.module';
import { UsersModule } from './users/users.module';
import { MediaFeedModule } from './media-feed/media-feed.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [DatabaseModule, AuthModule, ChatModule, MedicinesModule, CategoriesModule, OrdersModule, PromoCodesModule, DeliveryCountriesModule, NotificationsModule, TranslateModule, NewsletterModule, UploadModule, AnalyticsModule, DialogsModule, UsersModule, MediaFeedModule, ReviewsModule],
})
export class AppModule {}
