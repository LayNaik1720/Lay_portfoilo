import { useCallback, useMemo, useState } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { FilterPanel, FilterDrawer } from '../components/FilterPanel.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import {
  ProductGridSkeleton, ErrorState, NoResults, SmartImage,
} from '../components/ui/Primitives.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useSeo } from '../hooks/useSeo.js';
import { useStorefront } from '../context/StorefrontContext.jsx';
import { qs } from '../lib/api.js';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most popular' },
  { value: 'best_selling', label: 'Best selling' },
  { value: 'rating', label: 'Top rated' },
];

const FACET_KEYS = ['category', 'size', 'color', 'fabric', 'minPrice', 'maxPrice', 'availability', 'minDiscount', 'onSale', 'collection', 'tag'];

const FLAG_TITLES = {
  newArrival: { title: 'New Arrivals', blurb: 'The latest pieces to enter the atelier.' },
  bestSeller: { title: 'Best Sellers', blurb: 'Ranked by what our customers actually order.' },
  onSale: { title: 'Sale', blurb: 'Genuine reductions on selected pieces.' },
};

export default function ShopPage() {
  const [params, setParams] = useSearchParams();
  const { slug: categorySlug } = useParams();
  const { categories } = useStorefront();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const page = Number(params.get('page')) || 1;
  const sort = params.get('sort') || 'newest';
  const search = params.get('search') || '';

  // Values read by the filter panel — the URL is the single source of truth.
  const values = useMemo(() => {
    const v = {};
    FACET_KEYS.forEach((k) => { const val = params.get(k); if (val) v[k] = val; });
    if (categorySlug) v.category = categorySlug;
    return v;
  }, [params, categorySlug]);

  const activeCategory = categorySlug
    ? categories?.find((c) => c.slug === categorySlug)
    : null;

  const flagKey = ['newArrival', 'bestSeller'].find((k) => params.get(k) === 'true')
    || (params.get('onSale') === 'true' && !categorySlug ? 'onSale' : null);

  const query = useMemo(() => {
    const q = { page, limit: 12, sort };
    if (search) q.search = search;
    FACET_KEYS.forEach((k) => { if (values[k]) q[k] = values[k]; });
    ['newArrival', 'bestSeller', 'featured'].forEach((k) => {
      if (params.get(k) === 'true') q[k] = 'true';
    });
    return q;
  }, [page, sort, search, values, params]);

  const path = `/products${qs(query)}`;
  const { data: products, meta, loading, error, refetch } = useFetch(path);
  const { data: facets } = useFetch('/products/filters');

  /* ---------------------------------------------------- url mutation ------ */

  const update = useCallback((mutate) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      mutate(next);
      next.delete('page'); // any filter change resets pagination
      return next;
    }, { replace: true });
  }, [setParams]);

  const onSet = useCallback((key, value) => {
    update((next) => { if (value) next.set(key, value); else next.delete(key); });
  }, [update]);

  const onToggle = useCallback((key, value) => {
    update((next) => {
      const current = (next.get(key) || '').split(',').filter(Boolean);
      const idx = current.indexOf(value);
      if (idx >= 0) current.splice(idx, 1); else current.push(value);
      if (current.length) next.set(key, current.join(',')); else next.delete(key);
    });
  }, [update]);

  const onClear = useCallback(() => {
    update((next) => { FACET_KEYS.forEach((k) => next.delete(k)); });
  }, [update]);

  const activeChips = useMemo(() => {
    const chips = [];
    FACET_KEYS.forEach((key) => {
      const raw = params.get(key);
      if (!raw) return;
      if (key === 'minPrice') chips.push({ key, value: raw, label: `Min ₹${raw}` });
      else if (key === 'maxPrice') chips.push({ key, value: raw, label: `Max ₹${raw}` });
      else if (key === 'minDiscount') chips.push({ key, value: raw, label: `${raw}%+ off` });
      else if (key === 'onSale') chips.push({ key, value: raw, label: 'On sale' });
      else if (key === 'availability') chips.push({ key, value: raw, label: raw === 'in_stock' ? 'In stock' : 'Sold out' });
      else raw.split(',').filter(Boolean).forEach((v) => chips.push({ key, value: v, label: v }));
    });
    return chips;
  }, [params]);

  const removeChip = (chip) => {
    update((next) => {
      const current = (next.get(chip.key) || '').split(',').filter(Boolean);
      const remaining = current.filter((v) => v !== chip.value);
      if (remaining.length && current.length > 1) next.set(chip.key, remaining.join(','));
      else next.delete(chip.key);
    });
  };

  const goToPage = (n) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (n <= 1) next.delete('page'); else next.set('page', String(n));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const heading = activeCategory?.name || FLAG_TITLES[flagKey]?.title
    || (search ? `Results for “${search}”` : 'All pieces');
  const blurb = activeCategory?.subtitle || FLAG_TITLES[flagKey]?.blurb
    || 'Handcrafted clothing, made in small runs by artisans we know by name.';

  useSeo({
    title: heading,
    description: blurb,
    image: activeCategory?.image,
  });

  const totalPages = meta?.totalPages || 1;

  return (
    <>
      {/* ---- header: full-bleed image for category pages, type-only otherwise */}
      {activeCategory ? (
        <header className="relative isolate flex min-h-[38svh] items-end overflow-hidden bg-[var(--primary-dark)] md:min-h-[46svh]">
          <SmartImage
            src={activeCategory.image}
            alt=""
            ratio="16/9"
            className="absolute inset-0 h-full w-full"
            imgClassName="h-full"
            priority
          />
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{ background: 'linear-gradient(to top, rgba(21,41,31,0.8), rgba(21,41,31,0.15))' }}
          />
          <div className="shell relative z-10 pb-10 pt-16">
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex items-center gap-2 text-xs text-white/65">
                <li><Link to="/" className="hover:text-white">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link to="/shop" className="hover:text-white">Shop</Link></li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-white">{activeCategory.name}</li>
              </ol>
            </nav>
            <h1 className="display-xl text-white">{activeCategory.name}</h1>
            <p className="mt-3 max-w-md text-sm text-white/75">{blurb}</p>
          </div>
        </header>
      ) : (
        <header className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
          <div className="shell py-12 md:py-16">
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <li><Link to="/" className="link-underline">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-[var(--text)]">{heading}</li>
              </ol>
            </nav>
            <h1 className="display-xl">{heading}</h1>
            <p className="mt-3 max-w-lg text-sm text-[var(--text-muted)]">{blurb}</p>
          </div>
        </header>
      )}

      <div className="shell py-8 md:py-12">
        <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-12">
          {/* ---- desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-[calc(var(--header-height)+1.5rem)] max-h-[calc(100svh-var(--header-height)-3rem)] overflow-y-auto pr-2">
              <FilterPanel
                facets={facets}
                values={values}
                onToggle={onToggle}
                onSet={onSet}
                onClear={onClear}
                activeCount={activeChips.length}
              />
            </div>
          </aside>

          <div className="min-w-0">
            {/* ---- toolbar */}
            <div className="mb-6 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
              <p className="text-xs text-[var(--text-muted)]" aria-live="polite">
                {loading ? 'Loading…' : `${meta?.total ?? 0} piece${meta?.total === 1 ? '' : 's'}`}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="btn btn-outline btn-sm lg:hidden"
                  aria-haspopup="dialog"
                >
                  <SlidersHorizontal size={14} />
                  Filter{activeChips.length ? ` (${activeChips.length})` : ''}
                </button>

                <label className="sr-only" htmlFor="sort">Sort by</label>
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) => onSet('sort', e.target.value)}
                  className="field field-sm max-w-[10.5rem] cursor-pointer"
                >
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {/* ---- active filter chips */}
            {activeChips.length > 0 && (
              <ul className="mb-6 flex flex-wrap gap-2">
                {activeChips.map((chip) => (
                  <li key={`${chip.key}-${chip.value}`}>
                    <button
                      type="button"
                      onClick={() => removeChip(chip)}
                      className="inline-flex items-center gap-1.5 border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--text)]"
                    >
                      {chip.label}
                      <X size={12} aria-hidden="true" />
                      <span className="sr-only">Remove filter</span>
                    </button>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={onClear} className="px-2 py-1.5 text-xs link-underline">
                    Clear all
                  </button>
                </li>
              </ul>
            )}

            {/* ---- results */}
            {error ? (
              <ErrorState error={error} onRetry={refetch} />
            ) : loading ? (
              <ProductGridSkeleton count={12} />
            ) : products?.length ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 md:gap-x-6 md:gap-y-12">
                {products.map((p, i) => (
                  <ProductCard key={p._id} product={p} priority={i < 4} />
                ))}
              </div>
            ) : (
              <NoResults onClear={activeChips.length ? onClear : undefined} />
            )}

            {/* ---- pagination */}
            {totalPages > 1 && !loading && (
              <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="icon-btn disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .map((n, i, arr) => (
                    <span key={n} className="flex items-center gap-1.5">
                      {i > 0 && arr[i - 1] !== n - 1 && (
                        <span className="px-1 text-xs text-[var(--text-muted)]" aria-hidden="true">…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => goToPage(n)}
                        aria-current={n === page ? 'page' : undefined}
                        className={`h-9 min-w-9 border px-2 text-xs transition-colors ${
                          n === page
                            ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--text-inverse)]'
                            : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--text)]'
                        }`}
                      >
                        {n}
                      </button>
                    </span>
                  ))}

                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="icon-btn disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} resultCount={meta?.total}>
        <FilterPanel
          facets={facets}
          values={values}
          onToggle={onToggle}
          onSet={onSet}
          onClear={onClear}
          activeCount={activeChips.length}
        />
      </FilterDrawer>
    </>
  );
}
