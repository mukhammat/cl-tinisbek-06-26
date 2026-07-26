import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CategoriesService, CategoryPayload } from './categories.service';

@Controller('api')
export class CategoriesController {
  constructor(@Inject(CategoriesService) private readonly categoriesService: CategoriesService) {}

  // Public storefront read - `market` filters to what a single site should list.
  @Get('categories')
  getAll(@Query('market') market?: string) {
    return this.categoriesService.getAll(market);
  }

  // Admin panel read - every category for a full admin, or just their own market for a
  // market-scoped admin, mirroring MedicinesController.getAllForAdmin.
  @UseGuards(AdminGuard)
  @Get('categories/admin')
  getAllForAdmin(@Req() req: any) {
    return this.categoriesService.getAll(req.user.adminMarket ?? undefined);
  }

  @UseGuards(AdminGuard)
  @Post('categories')
  create(@Body() body: CategoryPayload, @Req() req: any) {
    return this.categoriesService.create(body, req.user.adminMarket);
  }

  @UseGuards(AdminGuard)
  @Put('categories/:id')
  update(@Param('id') id: string, @Body() body: CategoryPayload, @Req() req: any) {
    return this.categoriesService.update(id, body, req.user.adminMarket);
  }

  @UseGuards(AdminGuard)
  @Delete('categories/:id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.categoriesService.delete(id, req.user.adminMarket);
  }
}