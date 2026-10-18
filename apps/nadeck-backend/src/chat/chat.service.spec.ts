import { ChatService } from './chat.service';

describe('ChatService sales mode', () => {
  const prisma: any = {
    product: { findMany: jest.fn().mockResolvedValue([]) },
    deliveryCountry: { findMany: jest.fn().mockResolvedValue([]) },
  };
  // A fresh private chat: nothing stored yet, the bot is answering.
  const noDialogs: any = { touch: async () => ({ id: 'd0', pausedUntil: null }), history: async () => [], record: async () => undefined, isPaused: () => false };

  const setup = (placeTelegramOrder: jest.Mock) => {
    const service = new ChatService(prisma, { placeTelegramOrder } as any, noDialogs);
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

    expect(result).toMatchObject({ reply: 'Заказ оформлен', order });
    expect(placeTelegramOrder.mock.calls[0][0]).toMatchObject({ telegram: { id: 7, username: 'u' }, address: { phone: '+7700', city: 'Алматы' } });
    expect(create.mock.calls[0][0].tools.map((t: any) => t.function.name)).toEqual(['place_order', 'send_product_photos']);
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

  it('returns product photos the model asked to show', async () => {
    const photoPrisma: any = {
      product: {
        findMany: jest.fn(async (q: any) =>
          q?.where?.id ? [{ id: 'reta', name: { ru: 'Рета (Retarutide) — пептид' }, images: [], imagesAr: ['https://cdn/r.jpg'] }] : [],
        ),
      },
      deliveryCountry: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new ChatService(photoPrisma, {} as any, noDialogs);
    const create = jest
      .fn()
      .mockResolvedValueOnce({
        choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 'p1', type: 'function', function: { name: 'send_product_photos', arguments: '{"productIds":["reta"]}' } }] } }],
      })
      .mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: 'Вот фото' } }] });
    (service as any).openai = { chat: { completions: { create } } };
    (service as any).knowledgeBase = '';

    const result = await service.processChat({ message: 'покажи фото', history: [], mode: 'sales' });

    expect(result).toEqual({ reply: 'Вот фото', photos: [{ url: 'https://cdn/r.jpg', caption: 'Рета (Retarutide)' }] });
  });

  it('never offers the tool to the website widget', async () => {
    const service = new ChatService(prisma, {} as any, noDialogs);
    const create = jest.fn().mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });
    (service as any).openai = { chat: { completions: { create } } };
    (service as any).knowledgeBase = '';
    await service.processChat({ message: 'привет', history: [] });
    expect(create.mock.calls[0][0].tools).toBeUndefined();
  });
  it('falls back to the default model when the configured one is rejected', async () => {
    const previous = process.env.OPENAI_CHAT_MODEL;
    process.env.OPENAI_CHAT_MODEL = 'gpt-6-luna';
    try {
      const service = new ChatService(prisma, {} as any, noDialogs);
      const create = jest
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('tools not supported'), { status: 400 }))
        .mockResolvedValue({ choices: [{ message: { role: 'assistant', content: 'Здравствуйте' } }] });
      (service as any).openai = { chat: { completions: { create } } };
      (service as any).knowledgeBase = '';

      const result = await service.processChat({ message: 'привет', history: [], mode: 'sales' });
      await service.processChat({ message: 'ещё', history: [], mode: 'sales' });

      expect(result.reply).toBe('Здравствуйте');
      expect(create.mock.calls.map((c: any) => c[0].model)).toEqual(['gpt-6-luna', 'gpt-4o-mini', 'gpt-4o-mini']);
      expect(create.mock.calls[0][0].temperature).toBeUndefined();
      expect(create.mock.calls[0][0].reasoning_effort).toBe('none');
      expect(create.mock.calls[1][0].temperature).toBe(0.3);
    } finally {
      if (previous === undefined) delete process.env.OPENAI_CHAT_MODEL;
      else process.env.OPENAI_CHAT_MODEL = previous;
    }
  });
  it('transcribes a voice message for the bot', async () => {
    const service = new ChatService(prisma, {} as any, noDialogs);
    const create = jest.fn().mockResolvedValue({ text: ' Сколько стоит Рета? ' });
    (service as any).openai = { audio: { transcriptions: { create } } };

    const result = await service.transcribe({ buffer: Buffer.from('ogg'), originalname: 'file_1.oga', mimetype: 'audio/ogg' });

    expect(result).toEqual({ text: 'Сколько стоит Рета?' });
    expect(create.mock.calls[0][0].model).toBe('gpt-transcribe');
    expect(create.mock.calls[0][0].file.name).toBe('file_1.ogg');
  });

  describe('bot dialogs', () => {
    const dialogsStub = (pausedUntil: Date | null, stored: { role: 'user' | 'assistant'; text: string }[] = []) => ({
      touch: jest.fn().mockResolvedValue({ id: 'd1', pausedUntil }),
      history: jest.fn().mockResolvedValue(stored),
      record: jest.fn().mockResolvedValue(undefined),
      isPaused: (d: { pausedUntil: Date | null }) => !!d.pausedUntil && d.pausedUntil.getTime() > Date.now(),
    });

    it('stays silent while a manager has taken the chat over, but keeps the message', async () => {
      const dialogs = dialogsStub(new Date(Date.now() + 60_000));
      const service = new ChatService(prisma, {} as any, dialogs as any);
      const create = jest.fn();
      (service as any).openai = { chat: { completions: { create } } };

      const result = await service.processChat({ message: 'алло', history: [], mode: 'sales', customer: { id: 7 } });

      expect(result).toEqual({ reply: '', operator: true });
      expect(create).not.toHaveBeenCalled();
      expect(dialogs.record).toHaveBeenCalledWith('d1', 'customer', 'алло');
    });

    it('answers from the stored conversation, manager replies included, and records the answer', async () => {
      const dialogs = dialogsStub(new Date(Date.now() - 1000), [
        { role: 'user', text: 'есть Рета?' },
        { role: 'assistant', text: 'Да, есть — менеджер Анна' },
      ]);
      const service = new ChatService(prisma, {} as any, dialogs as any);
      const create = jest.fn().mockResolvedValue({ choices: [{ message: { role: 'assistant', content: 'Хорошо' } }] });
      (service as any).openai = { chat: { completions: { create } } };
      (service as any).knowledgeBase = '';

      const result = await service.processChat({ message: 'беру', history: [{ role: 'user', text: 'stale' }], mode: 'sales', customer: { id: 7 } });

      expect(result.reply).toBe('Хорошо');
      expect(create.mock.calls[0][0].messages.slice(1).map((m: any) => m.content)).toEqual(['есть Рета?', 'Да, есть — менеджер Анна', 'беру']);
      expect(dialogs.record).toHaveBeenLastCalledWith('d1', 'bot', 'Хорошо', undefined);
    });
  });
});
