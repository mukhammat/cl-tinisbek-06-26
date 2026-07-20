import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MEDICINES_DATA } from '../seeds/medicines.data';

const DEFAULT_CATEGORY_NAMES: Record<string, { ru: string; en: string; ar: string }> = {
  weightloss: { ru: 'Похудение & GLP-1', en: 'Fat Loss & GLP-1', ar: 'تخسيس الوزن & GLP-1' },
  healing: { ru: 'Восстановление & Суставы', en: 'Recovery & Healing', ar: 'الاستشفاء & المفاصل' },
  antiaging: { ru: 'Омоложение & Красота', en: 'Anti-Aging & Beauty', ar: 'مكافحة الشيخوخة والجمال' },
  painkiller: { ru: 'Обезболивающие', en: 'Painkillers', ar: 'مسكنات الألم' },
  vitamin: { ru: 'Витамины', en: 'Vitamins', ar: 'الفيتامينات' },
  antiallergic: { ru: 'Противоаллергические', en: 'Antiallergic', ar: 'مضادات الحساسية' },
  digestive: { ru: 'Пищеварение', en: 'Digestive', ar: 'الهضم' },
  additional: { ru: 'Дополнительные товары', en: 'Additional Goods', ar: 'المنتجات الإضافية' },
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    // Seeding is a first-boot/local-dev convenience only. In production the catalog is
    // managed entirely through the Admin Panel, so we never touch it automatically here -
    // that's what previously made categories look like they "reset" after every deploy.
    if (process.env.NODE_ENV !== 'production') {
      await this.seedCategories();
      await this.seedMedicines();
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private getSeedCategories() {
    const ids = Array.from(new Set([...Object.keys(DEFAULT_CATEGORY_NAMES), ...MEDICINES_DATA.map((med) => med.category)]));
    return ids.map((id, index) => ({
      id,
      name: DEFAULT_CATEGORY_NAMES[id] || { ru: id, en: id, ar: id },
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
      const count = await this.product.count();
      if (count === 0) {
        console.log('Seeding medicines...');
        for (const med of MEDICINES_DATA) {
          await this.product.create({
            data: {
              id: med.id,
              type: 'peptide',
              unit: 'mg',
              name: med.name,
              categoryId: med.category,
              description: med.description,
              fullDescription: med.fullDescription,
              image: med.image,
              rating: Number(med.rating),
              inStock: 1,
              medicine: {
                create: {
                  indications: med.indications,
                  contraindications: med.contraindications,
                  usage: med.usage,
                  form: med.form,
                  mgPerUnit: Number(med.mgPerUnit),
                  volumes: med.volumes || [],
                  dosageRules: med.dosageRules,
                },
              },
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
