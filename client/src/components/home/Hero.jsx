import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Play, ArrowRight } from 'lucide-react';
import { useStorefront } from '../../context/StorefrontContext.jsx';

/**
 * Cinematic hero. Uses a <picture> so mobile gets a portrait crop rather
 * than a squeezed desktop landscape.
 */
export function Hero({ onWatchVideo }) {
  const { settings } = useStorefront();
  const reduce = useReducedMotion();
  const hero = settings?.homepage?.hero || {};

  const ease = [0.16, 1, 0.3, 1];
  const rise = (delay) => ({
    initial: { opacity: 0, y: reduce ? 0 : 26 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.95, delay, ease },
  });

  return (
    <section className="relative isolate flex min-h-[86svh] items-end overflow-hidden bg-[var(--primary-dark)] md:min-h-[92svh]">
      {/* image */}
      <motion.div
        initial={{ opacity: 0, scale: reduce ? 1 : 1.07 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.7, ease }}
        className="absolute inset-0"
      >
        <picture>
          <source media="(max-width: 767px)" srcSet={hero.mobileImage || hero.image} />
          <img
            src={hero.image}
            alt=""
            fetchPriority="high"
            decoding="sync"
            className="h-full w-full object-cover"
            style={{ objectPosition: 'center 30%' }}
          />
        </picture>
      </motion.div>

      {/* legibility scrim — stronger at the bottom where the text sits */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(to top, rgba(21,41,31,0.82) 0%, rgba(21,41,31,0.45) 32%, rgba(21,41,31,0.12) 62%, rgba(21,41,31,0.25) 100%)',
        }}
      />

      <div className="shell relative z-10 w-full pb-14 pt-32 md:pb-20 lg:pb-24">
        <div className="max-w-2xl">
          <motion.p {...rise(0.25)} className="eyebrow mb-5 text-white/75">
            {hero.eyebrow}
          </motion.p>

          <motion.h1 {...rise(0.4)} className="display-hero text-white">
            {hero.title}
          </motion.h1>

          <motion.p {...rise(0.58)} className="mt-6 max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
            {hero.subtitle}
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.11, delayChildren: 0.72 } } }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <motion.div variants={{ hidden: { opacity: 0, y: reduce ? 0 : 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}>
              <Link to={hero.primaryLink || '/shop'} className="btn btn-light w-full sm:w-auto">
                {hero.primaryLabel} <ArrowRight size={14} />
              </Link>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: reduce ? 0 : 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}>
              <button type="button" onClick={onWatchVideo} className="btn btn-ghost-light w-full sm:w-auto">
                <Play size={13} /> {hero.secondaryLabel}
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.9 }}
        className="absolute bottom-6 right-6 hidden items-center gap-3 lg:flex"
        aria-hidden="true"
      >
        <span className="eyebrow-sm text-white/55">Scroll</span>
        <motion.span
          animate={reduce ? {} : { y: [0, 7, 0] }}
          transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
          className="block h-8 w-px bg-white/45"
        />
      </motion.div>
    </section>
  );
}
