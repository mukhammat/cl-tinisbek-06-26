import OpenAI from "openai";

// Deliberately separate from the backend's ChatService: the daily group greeting doesn't
// need the FAQ/product-catalog knowledge base (that stays backend-side, shared with the
// website widget) - it's a short, on-brand community message, so it gets its own small
// client and prompt instead of piggybacking on the much larger Q&A system prompt.
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    client = new OpenAI({ apiKey });
  }
  return client;
}

export type GreetingPeriod = "morning" | "evening";

const PERIOD_PROMPT: Record<GreetingPeriod, string> = {
  morning: "Сейчас утро, около 9:00 по времени Алматы. Напиши доброе утро участникам группы.",
  evening: "Сейчас вечер, около 19:00 по времени Алматы. Напиши доброй вечер участникам группы, можно спросить как прошёл день.",
};

const FALLBACK: Record<GreetingPeriod, string> = {
  morning: "Доброе утро! Хорошего дня всем. Если появятся вопросы про пептиды или другие товары Nadeck — пишите, всегда рады помочь.",
  evening: "Добрый вечер! Как прошёл день? Если остались вопросы про пептиды или другие товары Nadeck — пишите, ответим.",
};

export async function generateGreeting(period: GreetingPeriod): Promise<string> {
  try {
    const completion = await getClient().chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      temperature: 0.9,
      messages: [
        {
          role: "system",
          content:
            "Ты — дружелюбный community-менеджер Telegram-группы Nadeck (пептиды и товары для здоровья). " +
            "Раз в день пишешь короткое приветствие участникам: 1-2 предложения, тёплый и вежливый тон, без канцелярита, без markdown и без хэштегов. " +
            "Каждый раз формулируй по-новому, не повторяй прошлые сообщения дословно. " +
            "В конце естественно пригласи писать вопросы про пептиды или другие товары Nadeck, если они есть — не превращай это в рекламный слоган. " +
            "Пиши на русском языке.",
        },
        { role: "user", content: PERIOD_PROMPT[period] },
      ],
    });

    return completion.choices[0]?.message?.content?.trim() || FALLBACK[period];
  } catch (err) {
    console.error("Failed to generate greeting via OpenAI:", err);
    return FALLBACK[period];
  }
}
