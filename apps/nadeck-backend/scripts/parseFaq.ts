import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import * as cheerio from "cheerio";

const FAQ_DIR = join(__dirname, "..", "faq-sources");
const OUT_FILE = join(__dirname, "..", "src", "chat", "faq.json");

export interface FaqCard {
  id: string;
  source: string;
  question: string;
  answer: string;
}

function htmlAnswerToText($: cheerio.CheerioAPI, el: any): string {
  const $el = $(el).clone();
  $el.find(".kind").remove();
  $el.find("br").replaceWith("\n");
  return $el
    .text()
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseHtmlFile(path: string): FaqCard[] {
  const html = readFileSync(path, "utf-8");
  const $ = cheerio.load(html);
  const file = basename(path);
  const cards: FaqCard[] = [];

  $(".faq-item").each((i, el) => {
    const question = $(el).find(".qtext").first().text().trim();
    const answerEl = $(el).find(".answer-text").first();
    const answer = htmlAnswerToText($, answerEl.get(0));

    if (!question || !answer) return;

    cards.push({
      id: `${file}#${i + 1}`,
      source: file,
      question,
      answer,
    });
  });

  return cards;
}

interface RawJsonCard {
  question: string;
  answer: string;
}

function parseJsonFile(path: string): FaqCard[] {
  const raw: RawJsonCard[] = JSON.parse(readFileSync(path, "utf-8"));
  const file = basename(path);

  return raw
    .filter((c) => c.question?.trim() && c.answer?.trim())
    .map((c, i) => ({
      id: `${file}#${i + 1}`,
      source: file,
      question: c.question.trim(),
      answer: c.answer.trim(),
    }));
}

function main() {
  const files = readdirSync(FAQ_DIR).filter((f) => f.endsWith(".html") || f.endsWith(".json"));

  if (files.length === 0) {
    console.error(`Нет .html/.json файлов в ${FAQ_DIR}. Положи туда экспорт карточек и запусти снова.`);
    process.exit(1);
  }

  const allCards: FaqCard[] = [];
  for (const file of files) {
    const cards = file.endsWith(".json")
      ? parseJsonFile(join(FAQ_DIR, file))
      : parseHtmlFile(join(FAQ_DIR, file));
    console.log(`${file}: ${cards.length} карточек`);
    allCards.push(...cards);
  }

  writeFileSync(OUT_FILE, JSON.stringify(allCards, null, 2), "utf-8");
  console.log(`\nВсего: ${allCards.length} карточек -> ${OUT_FILE}`);
}

main();
