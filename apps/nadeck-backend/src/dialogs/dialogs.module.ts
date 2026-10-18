import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { DialogsController } from './dialogs.controller';
import { DialogsService } from './dialogs.service';

@Module({
  // AuthModule supplies the JwtService that AdminGuard resolves on the admin routes.
  imports: [DatabaseModule, AuthModule],
  controllers: [DialogsController],
  providers: [DialogsService],
  // ChatService records the bot's private chats through it.
  exports: [DialogsService],
})
export class DialogsModule {}
