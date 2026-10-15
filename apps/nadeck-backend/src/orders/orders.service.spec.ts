import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService.placeTelegramOrder', () => {
  const product = {
    id: 'reta',
    name: { ru: 'Рета', en: 'Reta', ar: 'Reta' },
    unit: 'mg',
    inStock: 1,
    medicine: { volumes: [{ mgPerUnit: 10, price: 53000, priceUsd: 116, priceSar: 0 }, { mgPerUnit: 20, price: 0, priceUsd: 0, priceSar: 0 }] },
    additionalGood: null,
  };

  const setup = (products: any[] = [product]) => {
    const prisma = {
      product: { findMany: jest.fn().mockResolvedValue(products) },
      order: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)) },
    };
    const deliveryCountries = { resolveFee: jest.fn().mockResolvedValue({ code: 'KZ', priceKzt: 3000, priceUsd: 7, priceSar: 0 }) };
    const service = new OrdersService(prisma as any, {} as any, deliveryCountries as any);
    return { service, prisma };
  };

  const body = (items: any[]) => ({
    items,
    address: { country: 'KZ', city: 'Алматы', street: 'Абая 1', name: 'Айгерим', phone: '+77001112233' },
    telegram: { id: 42, username: 'client' },
  });

  it('prices the order from the database, not from the request', async () => {
    const { service, prisma } = setup();
    const result = await service.placeTelegramOrder(body([{ productId: 'reta', mgPerUnit: 10, quantity: 2, price: 1 }]));

    expect(result.subtotal).toBe(106000);
    expect(result.delivery).toBe(3000);
    expect(result.totalPrice).toBe(109000);
    const data = prisma.order.create.mock.calls[0][0].data;
    expect(data.userEmail).toBe('tg:@client');
    expect(data.status).toBe('pending');
    expect(data.address).toMatchObject({ country: 'KZ', phone: '+77001112233', telegram: '@client' });
  });

  it('rejects a pack size without a price', async () => {
    const { service } = setup();
    await expect(service.placeTelegramOrder(body([{ productId: 'reta', mgPerUnit: 20, quantity: 1 }]))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects out-of-stock products', async () => {
    const { service } = setup([{ ...product, inStock: 0 }]);
    await expect(service.placeTelegramOrder(body([{ productId: 'reta', mgPerUnit: 10, quantity: 1 }]))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires a phone number', async () => {
    const { service } = setup();
    const request = body([{ productId: 'reta', mgPerUnit: 10, quantity: 1 }]);
    request.address.phone = '';
    await expect(service.placeTelegramOrder(request)).rejects.toBeInstanceOf(BadRequestException);
  });
});
