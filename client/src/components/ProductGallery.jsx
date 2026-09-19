import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import { SmartImage } from './ui/Primitives.jsx';

/**
 * Product imagery.
 * Mobile: full-bleed swipeable strip with dot indicators (no cramped thumbnails).
 * Desktop: vertical thumbnail rail beside a large stage image, plus a lightbox.
 */
export function ProductGallery({ images = [], name, activeIndex, onActiveIndexChange }) {
  const [internal, setInternal] = useState(0);
  const index = activeIndex ?? internal;
  const setIndex = onActiveIndexChange ?? setInternal;

  const [lightbox, setLightbox] = useState(false);
  const stripRef = useRef(null);

  const list = images.length ? images : [{ url: '', alt: name }];

  // Keep the mobile strip's scroll position in sync when the colour swatch
  // on the PDP changes the active image.
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const child = el.children[index];
    if (child && Math.abs(el.scrollLeft - child.offsetLeft) > 8) {
      el.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
    }
  }, [index]);

  const onStripScroll = () => {
    const el = stripRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index && next >= 0 && next < list.length) setIndex(next);
  };

  const step = (dir) => setIndex((index + dir + list.length) % list.length);

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <>
      {/* ---------------------------------------------------------- mobile -- */}
      <div className="md:hidden">
        <div
          ref={stripRef}
          onScroll={onStripScroll}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
        >
          {list.map((img, i) => (
            <div key={img.url || i} className="w-full shrink-0 snap-center">
              <SmartImage
                src={img.url}
                alt={img.alt || `${name} — view ${i + 1}`}
                ratio="4/5"
                priority={i === 0}
              />
            </div>
          ))}
        </div>

        {list.length > 1 && (
          <div className="flex justify-center gap-1.5 py-3.5" role="tablist" aria-label="Product images">
            {list.map((img, i) => (
              <button
                key={img.url || i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`View image ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1 rounded-full transition-all duration-400 ${
                  i === index ? 'w-6 bg-[var(--primary)]' : 'w-1.5 bg-[var(--border-strong)]'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* --------------------------------------------------------- desktop -- */}
      <div className="hidden gap-4 md:flex">
        {list.length > 1 && (
          <div className="flex w-20 shrink-0 flex-col gap-3" role="tablist" aria-label="Product images">
            {list.map((img, i) => (
              <button
                key={img.url || i}
                type="button"
                role="tab"
                aria-selected={i === index}
                onClick={() => setIndex(i)}
                className={`overflow-hidden border transition-colors ${
                  i === index ? 'border-[var(--primary)]' : 'border-transparent hover:border-[var(--border-strong)]'
                }`}
              >
                <SmartImage src={img.url} alt={`${name} thumbnail ${i + 1}`} ratio="3/4" />
              </button>
            ))}
          </div>
        )}

        <div className="relative min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={list[index]?.url || index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SmartImage
                src={list[index]?.url}
                alt={list[index]?.alt || name}
                ratio="4/5"
                priority
                sizes="(max-width: 1024px) 60vw, 45vw"
              />
            </motion.div>
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setLightbox(true)}
            aria-label="View image full screen"
            className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center bg-white/88 text-[var(--text)] backdrop-blur-sm transition-colors hover:bg-white"
          >
            <Expand size={15} />
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------- lightbox -- */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[90] grid place-items-center bg-[rgba(21,41,31,0.94)] p-4"
            role="dialog" aria-modal="true" aria-label={`${name} image viewer`}
          >
            <button
              type="button" onClick={() => setLightbox(false)}
              aria-label="Close viewer"
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center text-white/80 hover:text-white"
            >
              <X size={24} />
            </button>

            {list.length > 1 && (
              <>
                <button
                  type="button" onClick={() => step(-1)} aria-label="Previous image"
                  className="absolute left-3 grid h-12 w-12 place-items-center text-white/70 hover:text-white md:left-8"
                >
                  <ChevronLeft size={30} />
                </button>
                <button
                  type="button" onClick={() => step(1)} aria-label="Next image"
                  className="absolute right-3 grid h-12 w-12 place-items-center text-white/70 hover:text-white md:right-8"
                >
                  <ChevronRight size={30} />
                </button>
              </>
            )}

            <img
              src={list[index]?.url}
              alt={list[index]?.alt || name}
              className="max-h-[88svh] max-w-[92vw] object-contain"
            />
            <p className="absolute bottom-5 text-xs tracking-[0.2em] text-white/55">
              {index + 1} / {list.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
