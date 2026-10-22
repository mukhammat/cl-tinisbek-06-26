/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Language, MediaItem } from '../types';

interface PhotoGalleryProps {
  currentLang: Language;
  photos: MediaItem[];
}

// A sideways-scrolling row of large photo cards under the video feed. Tapping a photo opens a full-screen viewer
// that swipes sideways between the photos.
export default function PhotoGallery({ currentLang, photos }: PhotoGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <section className="space-y-4" id="photo-gallery">
      <p className="text-center text-xs sm:text-sm font-medium tracking-[0.18em] uppercase text-slate-500">
        {currentLang === 'ru' ? 'Фото' : 'Photos'}
      </p>
      <div className="-mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 sm:scroll-px-0 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none]">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="group relative shrink-0 snap-start w-60 sm:w-72 aspect-[4/5] overflow-hidden rounded-2xl bg-slate-200 text-start"
            aria-label={photo.title[currentLang] || (currentLang === 'ru' ? `Фото ${index + 1}` : `Photo ${index + 1}`)}
          >
            <img src={photo.src} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            {photo.title[currentLang] && (
              <>
                <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute bottom-0 inset-x-0 p-3 text-sm font-medium leading-snug text-white line-clamp-2">
                  {photo.title[currentLang]}
                </span>
              </>
            )}
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <PhotoViewer currentLang={currentLang} photos={photos} startIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </section>
  );
}

function PhotoViewer({
  currentLang,
  photos,
  startIndex,
  onClose,
}: {
  currentLang: Language;
  photos: MediaItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(startIndex);

  const goTo = (index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const clamped = Math.max(0, Math.min(photos.length - 1, index));
    scroller.scrollTo({ left: clamped * scroller.clientWidth, behavior: 'smooth' });
  };

  // Open on the tapped photo, lock the page behind, keyboard arrows and Escape.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollLeft = startIndex * scroller.clientWidth;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      const el = scrollerRef.current;
      if (!el) return;
      const index = Math.round(el.scrollLeft / el.clientWidth);
      if (e.key === 'ArrowRight') el.scrollTo({ left: (index + 1) * el.clientWidth, behavior: 'smooth' });
      if (e.key === 'ArrowLeft') el.scrollTo({ left: (index - 1) * el.clientWidth, behavior: 'smooth' });
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [startIndex, onClose]);

  const caption = photos[current]?.title[currentLang];

  return (
    <div className="fixed inset-0 z-[70] bg-black" role="dialog" aria-modal="true" id="photo-viewer">
      <div
        ref={scrollerRef}
        onScroll={(e) => setCurrent(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="h-full flex overflow-x-scroll snap-x snap-mandatory [scrollbar-width:none]"
      >
        {photos.map((photo) => (
          <div key={photo.id} className="h-full w-full shrink-0 snap-center flex items-center justify-center">
            <img src={photo.src} alt={photo.title[currentLang] || ''} className="max-h-full max-w-full object-contain" />
          </div>
        ))}
      </div>

      {caption && (
        <p className="absolute bottom-0 inset-x-0 px-5 pb-8 pt-16 text-center text-white text-base font-medium bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
          {caption}
        </p>
      )}
      <span className="absolute top-6 left-1/2 -translate-x-1/2 text-sm text-white/80">
        {current + 1} / {photos.length}
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label={currentLang === 'ru' ? 'Закрыть' : 'Close'}
        className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-white flex items-center justify-center"
      >
        <X className="w-6 h-6" />
      </button>
      {current > 0 && (
        <button
          type="button"
          onClick={() => goTo(current - 1)}
          aria-label={currentLang === 'ru' ? 'Предыдущее фото' : 'Previous photo'}
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {current < photos.length - 1 && (
        <button
          type="button"
          onClick={() => goTo(current + 1)}
          aria-label={currentLang === 'ru' ? 'Следующее фото' : 'Next photo'}
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white items-center justify-center"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
