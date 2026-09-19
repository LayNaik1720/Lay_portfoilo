import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { ArrowRight, Quote, Play, MapPin, Clock, Phone } from 'lucide-react';
import { SmartImage, SectionHeading, Reveal, Rating, ProductGridSkeleton } from '../ui/Primitives.jsx';
import { ProductCard } from '../ProductCard.jsx';
import { useStorefront } from '../../context/StorefrontContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { whatsappLink } from '../../lib/format.js';

/* ----------------------------------------------------------- new arrivals -- */

export function NewArrivals() {
  const { settings } = useStorefront();
  const { data, loading } = useFetch('/products?newArrival=true&limit=8');
  const home = settings?.homepage || {};

  if (!loading && !data?.length) return null;

  return (
    <section className="section bg-[var(--surface-muted)]">
      <div className="shell">
        <SectionHeading
          eyebrow="Just in"
          title={home.newArrivalsHeading}
          subtitle={home.newArrivalsSubtitle}
          action={(
            <Link to="/shop?newArrival=true" className="inline-flex items-center gap-2 text-sm link-underline">
              View all <ArrowRight size={14} />
            </Link>
          )}
          className="mb-10 md:mb-14"
        />

        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-6 md:gap-y-12">
            {data.map((p, i) => (
              <Reveal key={p._id} delay={Math.min(i * 0.05, 0.3)}>
                <ProductCard product={p} priority={i < 4} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- best sellers -- */

export function BestSellers() {
  const { settings } = useStorefront();
  const { data, loading } = useFetch('/products/best-sellers?limit=8');
  const home = settings?.homepage || {};

  if (!loading && !data?.length) return null;

  return (
    <section className="section">
      <div className="shell">
        <SectionHeading
          eyebrow="Loved most"
          title={home.bestSellersHeading}
          subtitle={home.bestSellersSubtitle}
          action={(
            <Link to="/shop?bestSeller=true" className="inline-flex items-center gap-2 text-sm link-underline">
              View all <ArrowRight size={14} />
            </Link>
          )}
          className="mb-10 md:mb-14"
        />
      </div>

      {/* Full-bleed swipeable rail on mobile, contained grid on desktop. */}
      {loading ? (
        <div className="shell"><ProductGridSkeleton count={4} /></div>
      ) : (
        <div className="scroll-x gap-4 px-5 md:hidden">
          {data.map((p) => (
            <div key={p._id} className="w-[62vw] max-w-[16rem]">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="shell hidden md:block">
          <div className="grid grid-cols-4 gap-x-6 gap-y-12">
            {data.slice(0, 8).map((p, i) => (
              <Reveal key={p._id} delay={Math.min(i * 0.05, 0.3)}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------ brand story -- */

export function BrandStory() {
  const { settings } = useStorefront();
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  // Gentle parallax — the image drifts slower than the page.
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-6%', '6%']);

  const home = settings?.homepage || {};

  return (
    <section ref={ref} className="relative overflow-hidden bg-[var(--primary)] text-[var(--text-inverse)]">
      <div className="grid lg:grid-cols-2">
        <div className="relative order-1 min-h-[52vh] overflow-hidden lg:order-none lg:min-h-[78vh]">
          <motion.div style={{ y }} className="absolute inset-[-8%]">
            <SmartImage
              src={home.storyImage}
              alt="Inside the Aarava atelier"
              ratio="4/3"
              className="h-full"
              imgClassName="h-full"
            />
          </motion.div>
        </div>

        <div className="flex items-center px-6 py-16 sm:px-10 md:px-14 lg:py-24 xl:px-20">
          <div className="max-w-xl">
            <Reveal>
              <p className="eyebrow mb-5 text-white/50">{home.storyHeading}</p>
              <h2 className="display-xl text-white">{home.storyTitle}</h2>
              <p className="mt-7 text-base leading-relaxed text-white/72">{home.storyBody}</p>

              <div className="mt-9 grid grid-cols-3 gap-6 border-t border-white/15 pt-7">
                {[
                  { value: '12+', label: 'Years' },
                  { value: '40+', label: 'Artisans' },
                  { value: '100%', label: 'Handmade' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="font-[var(--font-display)] text-3xl font-light text-white">{stat.value}</p>
                    <p className="eyebrow-sm mt-1 text-white/50">{stat.label}</p>
                  </div>
                ))}
              </div>

              <Link to="/about" className="btn btn-ghost-light mt-9">
                {home.storyCtaLabel} <ArrowRight size={14} />
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------- featured stories -- */

export function FeaturedStories() {
  const { settings } = useStorefront();
  const { data, loading } = useFetch('/stories');
  const home = settings?.homepage || {};

  if (loading || !data?.length) return null;

  return (
    <section className="section">
      <div className="shell">
        <SectionHeading
          eyebrow="Journal"
          title={home.storiesHeading}
          subtitle={home.storiesSubtitle}
          action={(
            <Link to="/stories" className="inline-flex items-center gap-2 text-sm link-underline">
              All stories <ArrowRight size={14} />
            </Link>
          )}
          className="mb-10 md:mb-14"
        />
      </div>

      <div className="scroll-x gap-4 px-5 md:px-10 lg:gap-6">
        {data.map((story, i) => (
          <article key={story._id} className="w-[76vw] max-w-[22rem] sm:w-[46vw] lg:w-[24rem]">
            <Reveal delay={Math.min(i * 0.06, 0.3)}>
              <StoryCard story={story} />
            </Reveal>
          </article>
        ))}
      </div>
    </section>
  );
}

export function StoryCard({ story }) {
  const Wrapper = story.link ? 'a' : 'div';
  const wrapperProps = story.link
    ? { href: story.link, target: '_blank', rel: 'noreferrer noopener' }
    : {};

  return (
    <Wrapper {...wrapperProps} className="group block">
      <div className="relative image-zoom bg-[var(--primary-dark)]">
        <SmartImage src={story.image} alt={story.title} ratio="4/5" />
        {story.videoUrl && (
          <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-white/22 backdrop-blur-sm transition-transform duration-500 group-hover:scale-110">
              <Play size={17} className="ml-0.5 text-white" fill="white" />
            </span>
          </span>
        )}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(21,41,31,0.65) 0%, rgba(21,41,31,0) 55%)' }}
          aria-hidden="true"
        />
        <span className="absolute left-3 top-3 badge bg-white/85 text-[var(--text)]">
          {story.kind?.replace(/_/g, ' ')}
        </span>
      </div>
      <h3 className="display-sm mt-4">{story.title}</h3>
      {story.description && (
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{story.description}</p>
      )}
    </Wrapper>
  );
}

/* ------------------------------------------------------------ testimonials -- */

export function Testimonials() {
  const { settings } = useStorefront();
  const { data, loading } = useFetch('/testimonials');
  if (loading || !data?.length) return null;

  return (
    <section className="section bg-[var(--surface-muted)]">
      <div className="shell">
        <Reveal className="mb-12 text-center">
          <p className="eyebrow mb-3 text-[var(--accent)]">Kind words</p>
          <h2 className="display-lg">{settings?.homepage?.testimonialsHeading}</h2>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {data.slice(0, 4).map((t, i) => (
            <Reveal key={t._id} delay={Math.min(i * 0.08, 0.32)}>
              <figure className="flex h-full flex-col border border-[var(--border)] bg-[var(--surface)] p-6">
                <Quote size={20} className="mb-4 text-[var(--accent)]" strokeWidth={1.3} aria-hidden="true" />
                <Rating value={t.rating} className="mb-4" />
                <blockquote className="flex-1">
                  <p className="font-[var(--font-display)] text-lg font-light leading-snug">
                    {t.quote}
                  </p>
                </blockquote>
                <figcaption className="mt-5 border-t border-[var(--border)] pt-4">
                  <p className="text-sm font-medium">{t.name}</p>
                  {t.location && <p className="text-xs text-[var(--text-muted)]">{t.location}</p>}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- visit boutique -- */

export function VisitBoutique() {
  const { settings } = useStorefront();
  const b = settings?.boutique || {};
  const contact = settings?.contact || {};
  const mapQuery = encodeURIComponent(b.mapQuery || `${b.addressLine1} ${b.addressLine2}`);

  return (
    <section className="section">
      <div className="shell">
        <div className="grid items-stretch gap-8 lg:grid-cols-2 lg:gap-14">
          <Reveal>
            <div className="image-zoom h-full">
              <SmartImage src={b.image} alt={b.name} ratio="4/3" className="h-full" />
            </div>
          </Reveal>

          <Reveal delay={0.1} className="flex flex-col justify-center">
            <p className="eyebrow mb-4 text-[var(--accent)]">Come see us</p>
            <h2 className="display-lg mb-6">Visit our boutique</h2>

            <dl className="space-y-5 border-t border-[var(--border)] pt-6">
              <div className="flex gap-4">
                <MapPin size={17} strokeWidth={1.4} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                <div>
                  <dt className="eyebrow-sm mb-1 text-[var(--text-muted)]">Address</dt>
                  <dd className="text-sm leading-relaxed">
                    {b.addressLine1}<br />{b.addressLine2}
                  </dd>
                </div>
              </div>

              <div className="flex gap-4">
                <Clock size={17} strokeWidth={1.4} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                <div>
                  <dt className="eyebrow-sm mb-1 text-[var(--text-muted)]">Hours</dt>
                  <dd className="text-sm leading-relaxed">
                    {b.openingHours}<br />
                    <span className="text-[var(--text-muted)]">{b.closedNote}</span>
                  </dd>
                </div>
              </div>

              <div className="flex gap-4">
                <Phone size={17} strokeWidth={1.4} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                <div>
                  <dt className="eyebrow-sm mb-1 text-[var(--text-muted)]">Contact</dt>
                  <dd className="text-sm">
                    <a href={`tel:${(contact.phone || '').replace(/\s/g, '')}`} className="link-underline">{contact.phone}</a>
                    {contact.whatsapp && (
                      <>
                        {' · '}
                        <a
                          href={whatsappLink(contact.whatsapp, 'Hello! I would like to visit the boutique.')}
                          target="_blank" rel="noreferrer noopener"
                          className="link-underline"
                        >
                          WhatsApp
                        </a>
                      </>
                    )}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target="_blank" rel="noreferrer noopener"
                className="btn btn-primary"
              >
                Get directions <ArrowRight size={14} />
              </a>
              <Link to="/store" className="btn btn-outline">Boutique details</Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
