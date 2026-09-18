import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  // DatabaseModule: deleting an image checks the catalog first, so a photo a product still
  // points at can't be removed from under it.
  imports: [AuthModule, DatabaseModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
