import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MEDICINES_DATA } from '../seeds/medicines.data';

const DEFAULT_CATEGORY_NAMES: Record<string, string> = {
  weightloss: 'Weight Loss',
  healing: 'Recovery & Healing',
  antiaging: 'Anti-Aging',
  painkiller: 'Painkillers',
  vitamin: 'Vitamins',
  antiallergic: 'Antiallergic',
  digestive: 'Digestive',
  additional: 'Additional Goods',
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await this.seedCategories();
    await this.seedMedicines();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private getSeedCategories() {
    const ids = Array.from(new Set([...Object.keys(DEFAULT_CATEGORY_NAMES), ...MEDICINES_DATA.map((med) => med.category)]));
    return ids.map((id, index) => ({
      id,
      name: DEFAULT_CATEGORY_NAMES[id] || id,
      sortOrder: index,
      isActive: true,
    }));
  }

  private async seedCategories() {
    try {
      const existing = await this.category.findMany({ select: { id: true } });
      const existingIds = new Set(existing.map((item) => item.id));
      const toCreate = this.getSeedCategories().filter((category) => !existingIds.has(category.id));

      if (toCreate.length > 0) {
        console.log('Seeding categories...');
        await this.category.createMany({ data: toCreate, skipDuplicates: true });
      }
    } catch (err) {
      console.error('Error seeding categories:', err);
    }
  }

  private async seedMedicines() {
    try {
      const count = await this.medicine.count();
      if (count === 0) {
        console.log('Seeding medicines...');
        for (const med of MEDICINES_DATA) {
          await this.medicine.create({
            data: {
              id: med.id,
              name: JSON.stringify(med.name),
              categoryId: med.category,
              activeSubstance: JSON.stringify(med.activeSubstance),
              description: JSON.stringify(med.description),
              fullDescription: JSON.stringify(med.fullDescription),
              indications: JSON.stringify(med.indications),
              contraindications: JSON.stringify(med.contraindications),
              usage: JSON.stringify(med.usage),
              price: Number(med.price),
              image: med.image,
              rating: Number(med.rating),
              form: med.form,
              mgPerUnit: Number(med.mgPerUnit),
              volumes: JSON.stringify(med.volumes || []),
              dosageRules: JSON.stringify(med.dosageRules),
              inStock: 1,
            },
          });
        }
        console.log(`Seeded ${MEDICINES_DATA.length} medicines.`);
      }
    } catch (err) {
      console.error('Error seeding medicines:', err);
    }
  }
}
