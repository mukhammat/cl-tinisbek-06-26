import { Body, Controller, Delete, Get, Inject, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
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

  // A video for the feed under the catalog (admin panel's "Videos & photos" tab).
  @UseGuards(AdminGuard)
  @Post('video')
  @UseInterceptors(FileInterceptor('file'))
  uploadVideo(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadVideo(file);
  }

  // Backs the admin panel's "pick from storage" gallery. Omit `folder` to list the whole bucket.
  @UseGuards(AdminGuard)
  @Get('library')
  library(@Query('folder') folder?: string) {
    return this.uploadService.listImages(folder);
  }

  // Deletes images from the bucket for good. Keys still referenced by a product gallery or a
  // category icon come back in `skipped` instead of being removed.
  @UseGuards(AdminGuard)
  @Delete('library')
  deleteFromLibrary(@Body() body: { keys?: unknown }) {
    return this.uploadService.deleteImages(body?.keys);
  }
}
