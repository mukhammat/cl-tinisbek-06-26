import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { MediaFeedController } from './media-feed.controller';
import { MediaFeedService } from './media-feed.service';

@Module({
  // AuthModule supplies the JwtService that AdminGuard resolves on the admin routes.
  imports: [DatabaseModule, AuthModule],
  controllers: [MediaFeedController],
  providers: [MediaFeedService],
})
export class MediaFeedModule {}
