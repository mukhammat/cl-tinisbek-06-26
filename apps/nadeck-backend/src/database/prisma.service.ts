import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MEDICINES_DATA } from '../seeds/medicines.data';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    await this.seedMedicines();
  }

  async onModuleDestroy() {
    await this.$disconnect();
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
              category: med.category,
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
