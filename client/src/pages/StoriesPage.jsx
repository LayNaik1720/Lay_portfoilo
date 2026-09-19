import { useState } from 'react';
import { StoryCard } from '../components/home/HomeSections.jsx';
import {
  Reveal, EmptyState, ErrorState, LoadingSkeleton,
} from '../components/ui/Primitives.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useSeo } from '../hooks/useSeo.js';

const KIND_LABELS = {
  behind_the_scenes: 'Behind the scenes',
  lookbook: 'Lookbook',
  reel: 'Reels',
  styling: 'Styling',
  event: 'Events',
  story: 'Stories',
};

const labelFor = (kind) => KIND_LABELS[kind]
  || String(kind || '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export default function StoriesPage() {
  const { data, loading, error, refetch } = useFetch('/stories');
  const [filter, setFilter] = useState('all');

  useSeo({
    title: 'Stories & reels',
    description: 'Films, lookbooks and notes from the Aarava atelier and the weavers we work with.',
  });

  const stories = data || [];
  // Build the filter bar from whatever kinds actually exist in the CMS.
  const visibleFilters = [
    { value: 'all', label: 'Everything' },
    ...[...new Set(stories.map((s) => s.kind).filter(Boolean))]
      .map((kind) => ({ value: kind, label: labelFor(kind) })),
  ];
  const filtered = filter === 'all' ? stories : stories.filter((s) => s.kind === filter);

  return (
    <>
      <header className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
        <div className="shell py-14 md:py-20">
          <p className="eyebrow mb-4 text-[var(--accent)]">Journal</p>
          <h1 className="display-hero max-w-2xl">Stories from the atelier</h1>
          <p className="mt-5 max-w-lg text-base text-[var(--text-muted)]">
            Short films, lookbooks and notes from the places our cloth comes from.
          </p>
        </div>
      </header>

      <div className="shell section">
        {visibleFilters.length > 2 && (
          <div className="mb-10 flex flex-wrap gap-2" role="tablist" aria-label="Filter stories">
            {visibleFilters.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.value)}
                  className={`border px-4 py-2 text-xs uppercase tracking-[0.14em] transition-colors ${
                    active
                      ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--text-inverse)]'
                      : 'border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--text)]'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        )}

        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : loading ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i}>
                <LoadingSkeleton className="aspect-[4/5] w-full" />
                <LoadingSkeleton className="mt-4 h-5 w-2/3" />
                <LoadingSkeleton className="mt-2 h-4 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-6">
            {filtered.map((story, i) => (
              <Reveal key={story._id} delay={Math.min(i * 0.06, 0.3)}>
                <StoryCard story={story} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing here yet"
            description="New stories are published as we visit the weavers. Check back soon."
          />
        )}
      </div>
    </>
  );
}
