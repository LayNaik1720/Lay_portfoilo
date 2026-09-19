import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { SmartImage, SectionHeading, Reveal } from '../ui/Primitives.jsx';
import { useStorefront } from '../../context/StorefrontContext.jsx';

/**
 * Asymmetric editorial grid.
 * Each category's `featureSize` decides how much room it takes, so the
 * layout is deliberately uneven rather than a uniform card wall.
 */
const SPANS = {
  large: 'md:col-span-7 md:row-span-2',
  tall: 'md:col-span-5 md:row-span-2',
  wide: 'md:col-span-7',
  regular: 'md:col-span-5',
};

const RATIOS = {
  large: '4/5',
  tall: '3/4',
  wide: '16/10',
  regular: '4/3',
};

export function CollectionGrid() {
  const { settings, categories } = useStorefront();
  if (!categories?.length) return null;

  const home = settings?.homepage || {};

  return (
    <section className="section">
      <div className="shell">
        <SectionHeading
          eyebrow="Explore"
          title={home.collectionsHeading}
          subtitle={home.collectionsSubtitle}
          action={(
            <Link to="/shop" className="inline-flex items-center gap-2 text-sm link-underline">
              View all <ArrowRight size={14} />
            </Link>
          )}
          className="mb-10 md:mb-14"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-12 md:gap-5">
          {categories.map((category, i) => {
            const size = category.featureSize || 'regular';
            return (
              <Reveal
                key={category.slug}
                delay={Math.min(i * 0.07, 0.35)}
                className={`${SPANS[size]} sm:col-span-1`}
              >
                <Link
                  to={`/category/${category.slug}`}
                  className="group relative block h-full overflow-hidden bg-[var(--primary-dark)]"
                >
                  <div className="image-zoom h-full">
                    <SmartImage
                      src={category.image}
                      alt={`${category.name} collection`}
                      ratio={RATIOS[size]}
                      className="h-full"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>

                  <div
                    className="pointer-events-none absolute inset-0 transition-opacity duration-700 group-hover:opacity-90"
                    style={{ background: 'linear-gradient(to top, rgba(21,41,31,0.78) 0%, rgba(21,41,31,0.25) 45%, rgba(21,41,31,0) 70%)' }}
                    aria-hidden="true"
                  />

                  <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
                    <motion.div
                      className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1"
                    >
                      <h3 className={`font-[var(--font-display)] font-light leading-none text-white ${size === 'large' ? 'text-4xl md:text-5xl' : 'text-2xl md:text-3xl'}`}>
                        {category.name}
                      </h3>
                      {category.subtitle && (
                        <p className="mt-2 text-sm text-white/70">{category.subtitle}</p>
                      )}
                      <span className="mt-4 inline-flex items-center gap-2 text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-white">
                        Explore
                        <ArrowRight size={13} className="transition-transform duration-500 group-hover:translate-x-1" />
                      </span>
                    </motion.div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
