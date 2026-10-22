import { Body, Controller, Delete, Get, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { ReviewsService, ReviewPayload } from './reviews.service';

// Customer reviews carousel under the photo gallery.
@Controller('api')
export class ReviewsController {
  constructor(@Inject(ReviewsService) private readonly reviewsService: ReviewsService) {}

  // Public: what the storefront shows, hidden items left out.
  @Get('reviews')
  getAll() {
    return this.reviewsService.getAll({ activeOnly: true });
  }

  @UseGuards(AdminGuard)
  @Get('admin/reviews')
  getAllForAdmin() {
    return this.reviewsService.getAll();
  }

  @UseGuards(AdminGuard)
  @Post('admin/reviews')
  create(@Body() body: ReviewPayload) {
    return this.reviewsService.create(body);
  }

  @UseGuards(AdminGuard)
  @Put('admin/reviews/:id')
  update(@Param('id') id: string, @Body() body: ReviewPayload) {
    return this.reviewsService.update(id, body);
  }

  @UseGuards(AdminGuard)
  @Delete('admin/reviews/:id')
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
