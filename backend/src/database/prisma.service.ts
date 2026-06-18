/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { MEDICINES_DATA } from '../../../src/data';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: `file:${path.join(process.cwd(), 'backend', 'data', 'pharmacy.db')}`,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    await this.migrateJsonToSqlite();
    await this.seedMedicines();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async migrateJsonToSqlite() {
    const jsonPath = path.join(process.cwd(), 'backend', 'data', 'db.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        if (data.users && Array.isArray(data.users)) {
          for (const u of data.users) {
            await this.user.upsert({
              where: { email: u.email.toLowerCase() },
              update: {},
              create: {
                email: u.email.toLowerCase(),
                password: u.password,
                fullName: u.fullName,
                phone: u.phone || '',
                address: u.address || '',
              },
            });
          }
        }
        if (data.orders && Array.isArray(data.orders)) {
          for (const o of data.orders) {
            const itemsStr = typeof o.items === 'string' ? o.items : JSON.stringify(o.items);
            const addrStr = typeof o.address === 'string' ? o.address : JSON.stringify(o.address);
            await this.order.upsert({
              where: { id: o.id },
              update: {},
              create: {
                id: o.id,
                date: o.date,
                userEmail: o.userEmail.toLowerCase(),
                items: itemsStr,
                totalPrice: Number(o.totalPrice),
                address: addrStr,
                paymentMethod: o.paymentMethod,
                status: o.status || 'pending',
              },
            });
          }
        }
        fs.renameSync(jsonPath, jsonPath + '.migrated');
        console.log('Successfully migrated json database to SQLite using Prisma!');
      } catch (e) {
        console.error('Error migrating JSON db using Prisma:', e);
      }
    }
  }

  private async seedMedicines() {
    try {
      const medCount = await this.medicine.count();
      if (medCount === 0) {
        console.log('Seeding medicines table from MEDICINES_DATA using Prisma...');
        
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
              dosageRules: JSON.stringify(med.dosageRules),
              inStock: 1,
            }
          });
        }
        console.log('Successfully seeded medicines count using Prisma:', MEDICINES_DATA.length);
      }
    } catch (err) {
      console.error('Error seeding medicines with Prisma:', err);
    }
  }
}
