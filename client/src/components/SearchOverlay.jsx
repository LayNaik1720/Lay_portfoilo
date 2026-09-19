import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, ArrowRight } from 'lucide-react';
import { api } from '../lib/api.js';
import { useDebounced } from '../hooks/useFetch.js';
import { SmartImage, PriceDisplay } from './ui/Primitives.jsx';

const SUGGESTED = ['Silk saree', 'Lehenga', 'Navratri', 'Kurti', 'Linen'];

/** Full-screen search with live suggestions. */
export function SearchOverlay({ open, onClose, onNavigate }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState({ products: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounced = useDebounced(term, 250);

  useEffect(() => {
    if (open) {
      setTerm('');
      setResults({ products: [], categories: [] });
      // Delay focus until the entry animation has started.
      const id = setTimeout(() => inputRef.current?.focus(), 120);
      document.body.style.overflow = 'hidden';
      return () => { clearTimeout(id); document.body.style.overflow = ''; };
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (debounced.trim().length < 2) { setResults({ products: [], categories: [] }); return; }
      setLoading(true);
      try {
        const res = await api.get(`/products/suggestions?q=${encodeURIComponent(debounced.trim())}`);
        if (!cancelled) setResults(res.data);
      } catch { /* leave previous results */ } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [debounced]);

  function submit(e) {
    e.preventDefault();
    if (!term.trim()) return;
    onNavigate(`/shop?search=${encodeURIComponent(term.trim())}`);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[115] bg-[var(--background)]"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <div className="flex h-full flex-col">
            <div className="shell flex items-center gap-3 border-b border-[var(--border)]" style={{ minHeight: 'var(--header-height)' }}>
              <form onSubmit={submit} className="flex flex-1 items-center gap-3">
                <Search size={19} strokeWidth={1.5} className="shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="search"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search sarees, lehengas, kurtis…"
                  aria-label="Search products"
                  className="w-full bg-transparent py-4 font-[var(--font-display)] text-xl font-light outline-none placeholder:text-[var(--text-muted)] sm:text-2xl"
                />
              </form>
              <button type="button" onClick={onClose} aria-label="Close search" className="-mr-2 grid h-11 w-11 shrink-0 place-items-center">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="shell py-8">
                {term.trim().length < 2 ? (
                  <div>
                    <p className="eyebrow mb-4 text-[var(--text-muted)]">Popular searches</p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setTerm(s)}
                          className="border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm transition hover:border-[var(--primary)]"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {results.categories?.length > 0 && (
                      <div className="mb-8">
                        <p className="eyebrow mb-3 text-[var(--text-muted)]">Collections</p>
                        <div className="flex flex-wrap gap-2">
                          {results.categories.map((c) => (
                            <Link
                              key={c.slug}
                              to={`/category/${c.slug}`}
                              onClick={onClose}
                              className="border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm transition hover:border-[var(--primary)]"
                            >
                              {c.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="eyebrow mb-4 text-[var(--text-muted)]">
                      {loading ? 'Searching…' : results.products?.length ? 'Pieces' : 'No matches'}
                    </p>

                    {results.products?.length > 0 ? (
                      <>
                        <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                          {results.products.map((p) => (
                            <li key={p._id}>
                              <Link to={`/product/${p.slug}`} onClick={onClose} className="group flex items-center gap-4">
                                <SmartImage
                                  src={p.images?.[0]?.url}
                                  alt={p.name}
                                  ratio="1/1"
                                  className="w-16 shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-sm">{p.name}</p>
                                  <PriceDisplay price={p.price} originalPrice={p.originalPrice} size="sm" className="mt-1" />
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={submit}
                          className="mt-8 inline-flex items-center gap-2 text-sm link-underline"
                        >
                          See all results for “{term}” <ArrowRight size={14} />
                        </button>
                      </>
                    ) : (
                      !loading && (
                        <p className="text-sm text-[var(--text-muted)]">
                          Nothing matched “{term}”. Try a fabric, colour or occasion.
                        </p>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
