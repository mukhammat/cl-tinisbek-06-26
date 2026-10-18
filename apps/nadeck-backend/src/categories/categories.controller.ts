import { Body, Controller, Delete, Get, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CategoriesService, CategoryPayload } from './categories.service';

@Controller('api')
export class CategoriesController {
  constructor(@Inject(CategoriesService) private readonly categoriesService: CategoriesService) {}

  @Get('categories')
  getAll() {
    return this.categoriesService.getAll();
  }

  @UseGuards(AdminGuard)
  @Post('categories')
  create(@Body() body: CategoryPayload) {
    return this.categoriesService.create(body);
  }

  @UseGuards(AdminGuard)
  @Put('categories/:id')
  update(@Param('id') id: string, @Body() body: CategoryPayload) {
    return this.categoriesService.update(id, body);
  }

  @UseGuards(AdminGuard)
  @Delete('categories/:id')
  delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}