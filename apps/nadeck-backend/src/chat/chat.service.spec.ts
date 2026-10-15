import { ChatService } from './chat.service';

describe('ChatService sales mode', () => {
  const prisma: any = {
    product: { findMany: jest.fn().mockResolvedValue([]) },
    deliveryCountry: { findMany: jest.fn().mockResolvedValue([]) },
  };

  const setup = (placeTelegramOrder: jest.Mock) => {
    const service = new ChatService(prisma, { placeTelegramOrder } as any);
    const create = jest
      .fn()
      .mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'place_order', arguments: JSON.stringify({ items: [{ productId: 'reta', mgPerUnit: 10, quantity: 1 }], name: 'A', phone: '+7700', city: 'Алматы', street: 'Абая 1' }) } }] } }],
      })
      .mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: 'Заказ оформлен' } }] });
    (service as any).openai = { chat: { completions: { create } } };
    (service as any).knowledgeBase = '';
    return { service, create };
  };

  it('places the order with the customer from the request and returns it', async () => {
    const order = { id: 'PP-1', subtotal: 1, delivery: 0, totalPrice: 1 };
    const placeTelegramOrder = jest.fn().mockResolvedValue(order);
    const { service, create } = setup(placeTelegramOrder);

    const result = await service.processChat({ message: 'да', history: [], mode: 'sales', customer: { id: 7, username: 'u' } });

    expect(result).toEqual({ reply: 'Заказ оформлен', order });
    expect(placeTelegramOrder.mock.calls[0][0]).toMatchObject({ telegram: { id: 7, username: 'u' }, address: { phone: '+7700', city: 'Алматы' } });
    expect(create.mock.calls[0][0].tools).toHaveLength(1);
  });

  it('feeds a rejected order back to the model instead of failing the chat', async () => {
    const { BadRequestException } = await import('@nestjs/common');
    const { service, create } = setup(jest.fn().mockRejectedValue(new BadRequestException('Product reta is not available')));

    const result = await service.processChat({ message: 'да', history: [], mode: 'sales' });

    expect(result).toEqual({ reply: 'Заказ оформлен' });
    const toolMessage = create.mock.calls[1][0].messages.at(-1);
    expect(toolMessage).toMatchObject({ role: 'tool', tool_call_id: 'c1' });
    expect(JSON.parse(toolMessage.content)).toEqual({ ok: false, error: 'Product reta is not available' });
  });

  it('never offers the tool to the website widget', async () => {
    const service = new ChatService(prisma, {} as any);
    const create = jest.fn().mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
    (service as any).openai = { chat: { completions: { create } } };
    (service as any).knowledgeBase = '';
    await service.processChat({ message: 'привет', history: [] });
    expect(create.mock.calls[0][0].tools).toBeUndefined();
  });
});
