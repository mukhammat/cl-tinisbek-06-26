import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { MediaFeedService, MediaItemPayload } from './media-feed.service';

// The video feed and the photo gallery under the catalog (?kind=video|photo).
@Controller('api')
export class MediaFeedController {
  constructor(@Inject(MediaFeedService) private readonly mediaFeedService: MediaFeedService) {}

  // Public: what the storefront shows, hidden items left out.
  @Get('media-feed')
  getAll(@Query('kind') kind?: string) {
    return this.mediaFeedService.getAll({ activeOnly: true, kind });
  }

  @UseGuards(AdminGuard)
  @Get('admin/media-feed')
  getAllForAdmin(@Query('kind') kind?: string) {
    return this.mediaFeedService.getAll({ kind });
  }

  @UseGuards(AdminGuard)
  @Post('admin/media-feed')
  create(@Body() body: MediaItemPayload) {
    return this.mediaFeedService.create(body);
  }

  @UseGuards(AdminGuard)
  @Put('admin/media-feed/:id')
  update(@Param('id') id: string, @Body() body: MediaItemPayload) {
    return this.mediaFeedService.update(id, body);
  }

  @UseGuards(AdminGuard)
  @Delete('admin/media-feed/:id')
  remove(@Param('id') id: string) {
    return this.mediaFeedService.remove(id);
  }
}
