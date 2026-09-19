import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Search, MessageCircle } from 'lucide-react';
import { EmptyState, ErrorState, LoadingSkeleton } from '../components/ui/Primitives.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useSeo } from '../hooks/useSeo.js';
import { useStorefront } from '../context/StorefrontContext.jsx';
import { whatsappLink } from '../lib/format.js';

function FaqItem({ faq, open, onToggle, id }) {
  return (
    <div className="border-b border-[var(--border)]">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-button`}
          className="flex w-full items-start justify-between gap-5 py-5 text-left"
        >
          <span className="font-[var(--font-display)] text-lg font-normal leading-snug md:text-xl">
            {faq.question}
          </span>
          <ChevronDown
            size={18}
            className={`mt-1 shrink-0 text-[var(--text-muted)] transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-panel`}
            role="region"
            aria-labelledby={`${id}-button`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="max-w-2xl pb-6 pr-8 text-sm leading-relaxed text-[var(--text-muted)]">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqPage() {
  const { data, loading, error, refetch } = useFetch('/faqs');
  const { settings } = useStorefront();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [category, setCategory] = useState('all');

  const faqs = data || [];

  const categories = useMemo(() => {
    const set = new Set(faqs.map((f) => f.category).filter(Boolean));
    return ['all', ...set];
  }, [faqs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs.filter((f) => {
      const matchesCategory = category === 'all' || f.category === category;
      const matchesQuery = !q
        || f.question.toLowerCase().includes(q)
        || f.answer.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [faqs, query, category]);

  useSeo({
    title: 'Frequently asked questions',
    description: 'Answers on shipping, returns, sizing, fabric care and custom orders at Aarava.',
    jsonLd: faqs.length ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    } : null,
  });

  const waNumber = settings?.contact?.whatsapp;

  return (
    <>
      <header className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
        <div className="shell py-14 md:py-20">
          <p className="eyebrow mb-4 text-[var(--accent)]">Help</p>
          <h1 className="display-hero max-w-2xl">Questions, answered</h1>
          <p className="mt-5 max-w-lg text-base text-[var(--text-muted)]">
            Shipping, sizing, fabric care and everything else people ask us most.
          </p>
        </div>
      </header>

      <div className="shell section">
        <div className="grid gap-10 lg:grid-cols-[1fr_18rem] lg:gap-16">
          <div className="min-w-0">
            {/* ---- search */}
            <div className="relative mb-8">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                aria-hidden="true"
              />
              <label className="sr-only" htmlFor="faq-search">Search questions</label>
              <input
                id="faq-search"
                type="search"
                className="field pl-10"
                placeholder="Search questions…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* ---- category chips */}
            {categories.length > 2 && (
              <div className="mb-8 flex flex-wrap gap-2">
                {categories.map((c) => {
                  const active = category === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setCategory(c)}
                      className={`border px-3.5 py-2 text-xs capitalize transition-colors ${
                        active
                          ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--text-inverse)]'
                          : 'border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--text)]'
                      }`}
                    >
                      {c === 'all' ? 'All topics' : c}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ---- list */}
            {error ? (
              <ErrorState error={error} onRetry={refetch} />
            ) : loading ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }, (_, i) => <LoadingSkeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filtered.length ? (
              <div>
                {filtered.map((faq) => (
                  <FaqItem
                    key={faq._id}
                    id={`faq-${faq._id}`}
                    faq={faq}
                    open={openId === faq._id}
                    onToggle={() => setOpenId(openId === faq._id ? null : faq._id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Search}
                title="No matching questions"
                description="Try different words, or message us — we answer quickly."
                action={query ? (
                  <button type="button" className="btn btn-outline" onClick={() => { setQuery(''); setCategory('all'); }}>
                    Clear search
                  </button>
                ) : undefined}
              />
            )}
          </div>

          {/* ---- still stuck */}
          <aside className="lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:self-start">
            <div className="border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="display-sm mb-3">Still stuck?</h2>
              <p className="mb-6 text-sm leading-relaxed text-[var(--text-muted)]">
                Our team answers every message personally — usually within the hour
                during boutique opening times.
              </p>
              <div className="flex flex-col gap-3">
                {waNumber && (
                  <a
                    href={whatsappLink(waNumber, 'Hello! I have a question that is not in the FAQ.')}
                    target="_blank" rel="noreferrer noopener"
                    className="btn btn-primary"
                  >
                    <MessageCircle size={14} /> WhatsApp us
                  </a>
                )}
                <Link to="/contact" className="btn btn-outline">Contact page</Link>
              </div>
            </div>

            <nav aria-label="Policies" className="mt-6 border border-[var(--border)] p-6">
              <h2 className="eyebrow-sm mb-4 text-[var(--text-muted)]">Policies</h2>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/shipping-policy" className="link-underline">Shipping policy</Link></li>
                <li><Link to="/returns" className="link-underline">Returns & exchanges</Link></li>
                <li><Link to="/privacy" className="link-underline">Privacy policy</Link></li>
                <li><Link to="/terms" className="link-underline">Terms of service</Link></li>
              </ul>
            </nav>
          </aside>
        </div>
      </div>
    </>
  );
}
