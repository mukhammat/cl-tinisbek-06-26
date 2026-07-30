import { Controller, Get, Inject, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/admin.guard';
import { UploadService } from './upload.service';

@Controller('api/upload')
export class UploadController {
  constructor(@Inject(UploadService) private readonly uploadService: UploadService) {}

  @UseGuards(AdminGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @Query('folder') folder?: string) {
    return this.uploadService.uploadImage(file, folder || 'misc');
  }

  // Backs the admin panel's "pick from storage" gallery. Omit `folder` to list the whole bucket.
  @UseGuards(AdminGuard)
  @Get('library')
  library(@Query('folder') folder?: string) {
    return this.uploadService.listImages(folder);
  }
}
