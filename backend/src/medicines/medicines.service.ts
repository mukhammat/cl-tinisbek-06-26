/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Inject, Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MedicinesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getAll() {
    try {
      const rows = await this.prisma.medicine.findMany();
      return rows.map((m) => ({
        id: m.id,
        name: JSON.parse(m.name),
        category: m.category,
        activeSubstance: JSON.parse(m.activeSubstance),
        description: JSON.parse(m.description),
        fullDescription: JSON.parse(m.fullDescription),
        indications: JSON.parse(m.indications),
        contraindications: JSON.parse(m.contraindications),
        usage: JSON.parse(m.usage),
        price: m.price,
        image: m.image,
        rating: m.rating,
        form: m.form,
        mgPerUnit: m.mgPerUnit,
        dosageRules: JSON.parse(m.dosageRules),
        inStock: m.inStock === 1,
      }));
    } catch (err) {
      console.error('Error fetching medicines:', err);
      throw new InternalServerErrorException('Database error occurred');
    }
  }

  async create(body: any) {
    const {
      id, name, category, activeSubstance, description, fullDescription,
      indications, contraindications, usage, price, image, rating, form, mgPerUnit, dosageRules, inStock
    } = body;

    if (!id || !name || !price) {
      throw new BadRequestException('Missing required medicine info');
    }

    try {
      await this.prisma.medicine.create({
        data: {
          id,
          name: JSON.stringify(name),
          category: category || 'weightloss',
          activeSubstance: JSON.stringify(activeSubstance || { ru: '', en: '', ar: '' }),
          description: JSON.stringify(description || { ru: '', en: '', ar: '' }),
          fullDescription: JSON.stringify(fullDescription || { ru: '', en: '', ar: '' }),
          indications: JSON.stringify(indications || { ru: [], en: [], ar: [] }),
          contraindications: JSON.stringify(contraindications || { ru: [], en: [], ar: [] }),
          usage: JSON.stringify(usage || { ru: '', en: '', ar: '' }),
          price: Number(price),
          image: image || 'https://images.unsplash.com/photo-1579154204601-01588f351166?w=600&auto=format&fit=crop&q=80',
          rating: Number(rating || 5.0),
          form: form || 'vial',
          mgPerUnit: Number(mgPerUnit || 5),
          dosageRules: JSON.stringify(dosageRules || { mgPerKgPerDay: 0.005, defaultDailyDoses: 1 }),
          inStock: inStock === false ? 0 : 1,
        }
      });
      return { success: true, id };
    } catch (err: any) {
      console.error('Error creating medicine:', err);
      throw new InternalServerErrorException(err.message || 'Database error occurred');
    }
  }

  async update(id: string, body: any) {
    const {
      name, category, activeSubstance, description, fullDescription,
      indications, contraindications, usage, price, image, rating, form, mgPerUnit, dosageRules, inStock
    } = body;

    try {
      await this.prisma.medicine.update({
        where: { id },
        data: {
          name: JSON.stringify(name),
          category,
          activeSubstance: JSON.stringify(activeSubstance),
          description: JSON.stringify(description),
          fullDescription: JSON.stringify(fullDescription),
          indications: JSON.stringify(indications),
          contraindications: JSON.stringify(contraindications),
          usage: JSON.stringify(usage),
          price: Number(price),
          image,
          rating: Number(rating),
          form,
          mgPerUnit: Number(mgPerUnit),
          dosageRules: JSON.stringify(dosageRules),
          inStock: inStock ? 1 : 0,
        }
      });
      return { success: true };
    } catch (err: any) {
      console.error('Error updating medicine:', err);
      throw new InternalServerErrorException(err.message || 'Database error occurred');
    }
  }

  async delete(id: string) {
    try {
      await this.prisma.medicine.delete({
        where: { id },
      });
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting medicine:', err);
      throw new InternalServerErrorException(err.message || 'Database error occurred');
    }
  }
}
