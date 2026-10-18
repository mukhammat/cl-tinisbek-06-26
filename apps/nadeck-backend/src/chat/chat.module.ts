import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DatabaseModule } from '../database/database.module';
import { OrdersModule } from '../orders/orders.module';
import { DialogsModule } from '../dialogs/dialogs.module';

@Module({
  imports: [DatabaseModule, OrdersModule, DialogsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
