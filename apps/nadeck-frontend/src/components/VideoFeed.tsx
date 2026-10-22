/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { Play, X, Volume2, VolumeX } from 'lucide-react';
import { Language, MediaItem } from '../types';

interface VideoFeedProps {
  currentLang: Language;
  videos: MediaItem[];
}

// A row of vertical video cards under the catalog. Tapping one opens a full-screen viewer where
// the videos scroll vertically one per screen (like Reels) and the one in view plays.
export default function VideoFeed({ currentLang, videos }: VideoFeedProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (videos.length === 0) return null;

  return (
    <section className="space-y-4" id="video-feed">
      <p className="text-center text-xs sm:text-sm font-medium tracking-[0.18em] uppercase text-slate-500">
        {currentLang === 'ru' ? 'Видео' : 'Videos'}
      </p>
      <div className="-mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 sm:scroll-px-0 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none]">
        {videos.map((video, index) => (
          <button
            key={video.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="group relative shrink-0 snap-start w-40 sm:w-48 aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 text-start"
            aria-label={video.title[currentLang] || (currentLang === 'ru' ? 'Смотреть видео' : 'Watch video')}
          >
            {video.poster ? (
              <img src={video.poster} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            ) : (
              <video
                src={`${video.src}#t=0.1`}
                className="absolute inset-0 w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/85 group-hover:bg-white flex items-center justify-center text-slate-900 transition-colors">
              <Play className="w-5 h-5 ms-0.5 fill-current" />
            </span>
            {video.title[currentLang] && (
              <span className="absolute bottom-0 inset-x-0 p-3 text-sm font-medium leading-snug text-white line-clamp-3">
                {video.title[currentLang]}
              </span>
            )}
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <VideoViewer currentLang={currentLang} videos={videos} startIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </section>
  );
}

function VideoViewer({
  currentLang,
  videos,
  startIndex,
  onClose,
}: {
  currentLang: Language;
  videos: MediaItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [muted, setMuted] = useState(false);

  // Open on the tapped video, lock the page behind, close on Escape.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = startIndex * scroller.clientHeight;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [startIndex, onClose]);

  // Play whichever video fills the screen, pause and rewind the rest.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Autoplay with sound can be refused; retry muted so the feed keeps moving.
              video.muted = true;
              setMuted(true);
              video.play().catch(() => {});
            });
          } else {
            video.pause();
            video.currentTime = 0;
          }
        }
      },
      { root: scrollerRef.current, threshold: 0.6 },
    );
    videoRefs.current.forEach((video) => video && observer.observe(video));
    return () => observer.disconnect();
  }, [videos]);

  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (video) video.muted = muted;
    });
  }, [muted]);

  return (
    <div className="fixed inset-0 z-[70] bg-black" role="dialog" aria-modal="true" id="video-viewer">
      <div ref={scrollerRef} className="h-full overflow-y-scroll snap-y snap-mandatory [scrollbar-width:none]">
        {videos.map((video, index) => (
          <div key={video.id} className="relative h-full snap-start snap-always flex items-center justify-center">
            <video
              ref={(el) => {
                videoRefs.current[index] = el;
              }}
              src={video.src}
              poster={video.poster || undefined}
              className="h-full w-full max-w-[min(100vw,56.25vh)] object-contain bg-black"
              playsInline
              loop
              preload={Math.abs(index - startIndex) <= 1 ? 'auto' : 'metadata'}
              onClick={(e) => {
                const el = e.currentTarget;
                if (el.paused) el.play().catch(() => {});
                else el.pause();
              }}
            />
            {video.title[currentLang] && (
              <p className="absolute bottom-0 inset-x-0 mx-auto max-w-[min(100vw,56.25vh)] px-5 pb-8 pt-16 text-white text-base font-medium leading-snug bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                {video.title[currentLang]}
              </p>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label={currentLang === 'ru' ? 'Закрыть' : 'Close'}
        className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-white flex items-center justify-center"
      >
        <X className="w-6 h-6" />
      </button>
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? (currentLang === 'ru' ? 'Включить звук' : 'Unmute') : (currentLang === 'ru' ? 'Выключить звук' : 'Mute')}
        className="absolute top-4 left-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-white flex items-center justify-center"
      >
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
    </div>
  );
}
