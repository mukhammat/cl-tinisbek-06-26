import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { FaqCard } from "../scripts/parseFaq.js";

const FAQ_FILE = join(import.meta.dirname, "..", "..", "data", "faq.json");

let cached: string | null = null;

export function loadKnowledgeBase(): string {
  if (!cached) {
    const cards: FaqCard[] = JSON.parse(readFileSync(FAQ_FILE, "utf-8"));
    cached = cards.map((c, i) => `[${i + 1}] Вопрос: ${c.question}\nОтвет: ${c.answer}`).join("\n\n");
  }
  return cached;
}
