import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { SmartImage, Reveal, SectionHeading } from '../components/ui/Primitives.jsx';
import { Testimonials, VisitBoutique } from '../components/home/HomeSections.jsx';
import { useStorefront } from '../context/StorefrontContext.jsx';
import { useSeo } from '../hooks/useSeo.js';

const VALUES = [
  {
    title: 'Made by hand',
    body: 'Every garment is cut and finished by a person, not a production line. Small irregularities are evidence of that, not defects.',
  },
  {
    title: 'Paid fairly',
    body: 'We buy directly from weaving clusters in Gujarat, Varanasi and Bhuj, and we pay before the cloth ships — not ninety days later.',
  },
  {
    title: 'Made to last',
    body: 'Natural fibres, reinforced seams and honest construction. We would rather sell you one saree you keep than four you replace.',
  },
  {
    title: 'Made in small runs',
    body: 'Most pieces are produced in runs of twenty or fewer. When a weave sells out, it is often genuinely gone.',
  },
];

const TIMELINE = [
  { year: '2013', title: 'A single loom', body: 'Aarava began as a stall of six handwoven sarees at a Surat weekend market.' },
  { year: '2017', title: 'The first atelier', body: 'We opened a two-room studio and started working directly with weaving families.' },
  { year: '2021', title: 'Forty artisans', body: 'Our maker network grew across three states, all on direct, pre-paid terms.' },
  { year: '2024', title: 'The boutique', body: 'We opened our flagship boutique so people could feel the cloth before buying it.' },
];

export default function AboutPage() {
  const { settings } = useStorefront();
  const home = settings?.homepage || {};

  useSeo({
    title: 'Our story',
    description: 'Aarava is a small boutique label making handwoven, hand-finished clothing with artisans across Gujarat, Varanasi and Bhuj.',
    image: '/images/editorial/about.jpg',
  });

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <header className="relative isolate flex min-h-[52svh] items-end overflow-hidden bg-[var(--primary-dark)] md:min-h-[64svh]">
        <SmartImage
          src="/images/editorial/about.jpg"
          alt=""
          ratio="16/9"
          priority
          className="absolute inset-0 h-full w-full"
          imgClassName="h-full"
        />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{ background: 'linear-gradient(to top, rgba(21,41,31,0.85), rgba(21,41,31,0.15))' }}
        />
        <div className="shell relative z-10 pb-12 pt-24 md:pb-16">
          <p className="eyebrow mb-4 text-white/60">Since 2013</p>
          <h1 className="display-hero max-w-3xl text-white">Cloth with a memory</h1>
          <p className="mt-5 max-w-lg text-base text-white/75">
            We make clothes the slow way, with people whose names we know.
          </p>
        </div>
      </header>

      {/* --------------------------------------------------------- opening */}
      <section className="section">
        <div className="shell">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
            <Reveal>
              <p className="eyebrow mb-4 text-[var(--accent)]">Who we are</p>
              <h2 className="display-xl">{home.storyTitle || 'A small label, made slowly'}</h2>
            </Reveal>
            <Reveal delay={0.1} className="space-y-5 text-base leading-relaxed text-[var(--text-muted)]">
              <p>
                Aarava started with six sarees and a folding table. We had no plan beyond
                a stubborn conviction that handwoven cloth deserved better than being sold
                as a novelty — that it could be everyday clothing, worn hard and loved long.
              </p>
              <p>
                Twelve years later, not much about the method has changed. We still buy
                directly from the people who make the cloth. We still produce in runs small
                enough to count by hand. We still check every piece on a table in the back
                room before it goes into a box.
              </p>
              <p>
                What has changed is the number of people involved: more than forty artisans
                across Gujarat, Varanasi and Bhuj now make the pieces you see here, and each
                of them is paid in full before the cloth leaves their loom.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- values */}
      <section className="section bg-[var(--surface-muted)]">
        <div className="shell">
          <SectionHeading
            eyebrow="What we hold to"
            title="Four things we refuse to compromise"
            className="mb-12"
          />
          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {VALUES.map((value, i) => (
              <Reveal key={value.title} delay={Math.min(i * 0.08, 0.3)}>
                <article className="border-t border-[var(--border-strong)] pt-6">
                  <p className="eyebrow-sm mb-3 text-[var(--accent)]">0{i + 1}</p>
                  <h3 className="display-sm mb-3">{value.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">{value.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- timeline */}
      <section className="section">
        <div className="shell">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
            <Reveal className="lg:sticky lg:top-[calc(var(--header-height)+3rem)] lg:self-start">
              <p className="eyebrow mb-4 text-[var(--accent)]">The long way round</p>
              <h2 className="display-xl mb-6">How we got here</h2>
              <div className="image-zoom">
                <SmartImage src="/images/editorial/boutique.jpg" alt="The Aarava boutique" ratio="4/3" />
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <ol className="relative">
                {TIMELINE.map((entry, i) => (
                  <li key={entry.year} className="relative flex gap-6 pb-10 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span className="grid h-3 w-3 shrink-0 place-items-center rounded-full bg-[var(--primary)]" aria-hidden="true" />
                      {i < TIMELINE.length - 1 && <span className="w-px flex-1 bg-[var(--border)]" aria-hidden="true" />}
                    </div>
                    <div className="-mt-1.5 pb-2">
                      <p className="font-[var(--font-display)] text-2xl font-light text-[var(--accent)]">{entry.year}</p>
                      <h3 className="mt-1 text-base font-medium">{entry.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{entry.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- pull quote */}
      <section className="bg-[var(--primary)] py-20 text-center md:py-28">
        <div className="shell">
          <Reveal>
            <blockquote className="mx-auto max-w-3xl">
              <p className="font-[var(--font-display)] text-3xl font-light leading-tight text-white md:text-5xl">
                “A machine can copy a pattern. It cannot remember the hands that made it.”
              </p>
              <footer className="mt-7 text-sm text-white/55">
                Meera Shah — founder
              </footer>
            </blockquote>
          </Reveal>
        </div>
      </section>

      <Testimonials />
      <VisitBoutique />

      <section className="section border-t border-[var(--border)] text-center">
        <div className="shell">
          <h2 className="display-lg mb-4">See what we’re making now</h2>
          <p className="mx-auto mb-8 max-w-md text-sm text-[var(--text-muted)]">
            New weaves arrive every few weeks, usually in very small numbers.
          </p>
          <Link to="/shop" className="btn btn-primary">
            Shop the collection <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </>
  );
}
