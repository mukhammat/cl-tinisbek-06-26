/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Star, X } from 'lucide-react';
import { Language, Review } from '../types';

interface ReviewsCarouselProps {
  currentLang: Language;
  reviews: Review[];
}

// "1 year ago" / "3 месяца назад" from the review's date.
function timeAgo(date: string, lang: Language): string {
  const days = Math.floor((Date.now() - Date.parse(date)) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (days < 1) return rtf.format(0, 'day');
  if (days < 7) return rtf.format(-days, 'day');
  if (days < 30) return rtf.format(-Math.floor(days / 7), 'week');
  if (days < 365) return rtf.format(-Math.floor(days / 30), 'month');
  return rtf.format(-Math.floor(days / 365), 'year');
}

// "1 отзыв / 3 отзыва / 5 отзывов".
function reviewsWord(count: number, lang: Language): string {
  if (lang !== 'ru') return count === 1 ? 'review' : 'reviews';
  const forms: Record<string, string> = { one: 'отзыв', few: 'отзыва', many: 'отзывов', other: 'отзыва' };
  return forms[new Intl.PluralRules('ru').select(count)];
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

// The badge next to a verified buyer's name: a scalloped seal with a check mark.
function VerifiedBadge({ label, className = 'w-5 h-5' }: { label: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} role="img" aria-label={label}>
      <path
        fill="#0692ef"
        d="M12 1.5l2.1 1.6 2.6-.4 1 2.4 2.4 1-.4 2.6 1.6 2.1-1.6 2.1.4 2.6-2.4 1-1 2.4-2.6-.4L12 22.5l-2.1-1.6-2.6.4-1-2.4-2.4-1 .4-2.6L2.7 13.2l1.6-2.1-.4-2.6 2.4-1 1-2.4 2.6.4z"
      />
      <path d="M8 12.3l2.6 2.6L16.2 9.3" fill="none" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Stars({ rating, label, size }: { rating: number; label: string; size: string }) {
  return (
    <div className="flex gap-0.5 shrink-0" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= rating ? 'fill-[#f7b81b] text-[#f7b81b]' : 'fill-slate-200 text-slate-200'}`} />
      ))}
    </div>
  );
}

// The small card riding in the marquee: name, stars and the first two lines; a tap opens the full review.
function ReviewChip({ review, currentLang, hidden, onOpen }: { review: Review; currentLang: Language; hidden: boolean; onOpen: () => void }) {
  const ru = currentLang === 'ru';
  return (
    <button
      type="button"
      onClick={onOpen}
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
      className="shrink-0 w-[min(320px,78vw)] bg-white rounded-2xl border border-slate-200/80 px-[18px] py-4 flex flex-col gap-2 text-start transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(15,23,42,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nadeck-500"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 min-w-0 font-medium text-slate-900">
          <span className="truncate">{review.author}</span>
          {review.isVerified && <VerifiedBadge label={ru ? 'Подтверждённый покупатель' : 'Verified buyer'} className="w-[18px] h-[18px]" />}
        </span>
        <Stars rating={review.rating} size="w-3.5 h-3.5" label={ru ? `Оценка ${review.rating} из 5` : `Rated ${review.rating} out of 5`} />
      </span>
      <span className="text-[15px] leading-normal text-slate-800 line-clamp-2 min-h-[3em]">{review.text}</span>
      <span className="text-sm text-nadeck-600">{ru ? 'Читать полностью' : 'Read in full'}</span>
    </button>
  );
}

// The full review: a centred window on wider screens, a sheet sliding up from the bottom on phones.
// Steps through the other reviews without closing; Escape, the cross or a tap outside closes it.
function ReviewViewer({ reviews, index, currentLang, onIndex, onClose }: {
  reviews: Review[];
  index: number;
  currentLang: Language;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const ru = currentLang === 'ru';
  const closeRef = useRef<HTMLButtonElement>(null);
  const review = reviews[index];
  const step = (direction: -1 | 1) => onIndex((index + direction + reviews.length) % reviews.length);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/45 flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-viewer-name"
        className="reviews-sheet relative w-full sm:max-w-xl max-h-[85vh] sm:max-h-[min(80vh,640px)] bg-white rounded-t-3xl sm:rounded-3xl flex flex-col pb-[env(safe-area-inset-bottom)] sm:pb-0"
      >
        <div className="sm:hidden mx-auto mt-2.5 w-10 h-1 rounded-full bg-slate-200" aria-hidden="true" />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={ru ? 'Закрыть' : 'Close'}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-nadeck-50 hover:bg-nadeck-100 flex items-center justify-center text-slate-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="overflow-y-auto px-5 pt-3 pb-5 sm:px-9 sm:pt-8 sm:pb-7 flex flex-col gap-3.5">
          <div className="flex items-center gap-3 pr-11">
            <div className="w-12 h-12 shrink-0 rounded-full bg-nadeck-800 text-nadeck-50 flex items-center justify-center font-medium text-lg">
              {initials(review.author)}
            </div>
            <div className="min-w-0">
              <h3 id="review-viewer-name" className="flex items-center gap-1.5 text-xl font-medium text-slate-900">
                <span className="truncate">{review.author}</span>
                {review.isVerified && <VerifiedBadge label={ru ? 'Подтверждённый покупатель' : 'Verified buyer'} />}
              </h3>
              <p className="text-sm text-slate-500">
                {review.isVerified && (ru ? 'Подтверждённый покупатель · ' : 'Verified buyer · ')}
                {timeAgo(review.date, currentLang)}
              </p>
            </div>
          </div>
          <Stars rating={review.rating} size="w-[22px] h-[22px]" label={ru ? `Оценка ${review.rating} из 5` : `Rated ${review.rating} out of 5`} />
          <p className="text-[17px] leading-relaxed text-slate-800 whitespace-pre-line">{review.text}</p>
        </div>
        {reviews.length > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-3 sm:px-5 py-3">
            <button type="button" onClick={() => step(-1)} className="flex items-center gap-1 rounded-full px-3 py-2 text-[15px] text-slate-900 hover:bg-nadeck-50">
              <ChevronLeft className="w-4 h-4" />
              {ru ? 'Предыдущий' : 'Previous'}
            </button>
            <span className="text-sm text-slate-500 tabular-nums">
              {index + 1} {ru ? 'из' : 'of'} {reviews.length}
            </span>
            <button type="button" onClick={() => step(1)} className="flex items-center gap-1 rounded-full px-3 py-2 text-[15px] text-slate-900 hover:bg-nadeck-50">
              {ru ? 'Следующий' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Customer reviews as a marquee: two lanes drifting in opposite directions (one when there are few
// reviews), paused under the pointer; tapping a card opens the full review.
export default function ReviewsCarousel({ currentLang, reviews }: ReviewsCarouselProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const ru = currentLang === 'ru';

  if (reviews.length === 0) return null;

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  // Indexes into `reviews`, alternated between the lanes; each lane is padded out by repeating
  // its own cards so it is always wider than the screen.
  const laneCount = reviews.length >= 6 ? 2 : 1;
  const lanes = Array.from({ length: laneCount }, (_, lane) => {
    const own = reviews.map((_, i) => i).filter((i) => i % laneCount === lane);
    const filled = [...own];
    while (filled.length < 6) filled.push(...own);
    return filled;
  });

  return (
    <section className="space-y-5 pt-12 sm:pt-20" id="reviews">
      <div className="text-center space-y-1">
        <h2 className="text-3xl sm:text-4xl font-normal text-slate-900">{ru ? 'Отзывы' : 'Reviews'}</h2>
        <p className="text-sm text-slate-500 flex items-center justify-center gap-1.5">
          <Star className="w-4 h-4 fill-[#f7b81b] text-[#f7b81b]" />
          {average.toFixed(1)} · {reviews.length} {reviewsWord(reviews.length, currentLang)}
        </p>
      </div>

      <div
        className="reviews-marquee -mx-4 sm:mx-0 overflow-hidden flex flex-col gap-3.5 py-1 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]"
        data-paused={openIndex !== null || undefined}
      >
        {lanes.map((lane, laneIndex) => (
          <div
            key={laneIndex}
            className={`reviews-lane flex gap-3.5 w-max ${laneIndex === 1 ? 'reviews-lane-reverse' : ''}`}
            style={{ ['--reviews-duration' as string]: `${lane.length * 9}s` }}
          >
            {[...lane, ...lane].map((reviewIndex, slot) => (
              <div key={slot} className="contents">
                <ReviewChip
                  review={reviews[reviewIndex]}
                  currentLang={currentLang}
                  hidden={slot >= lane.length || lane.indexOf(reviewIndex) !== slot}
                  onOpen={() => setOpenIndex(reviewIndex)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {openIndex !== null && (
        <ReviewViewer
          reviews={reviews}
          index={openIndex}
          currentLang={currentLang}
          onIndex={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  );
}
