import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Check, ChevronDown } from 'lucide-react';
import { formatPrice } from '../lib/format.js';

/** Collapsible facet group. */
function Group({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--border)] py-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="eyebrow-sm text-[var(--text)]">{title}</span>
        <ChevronDown
          size={15}
          className={`text-[var(--text-muted)] transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckRow({ label, checked, onChange, swatch }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5 text-sm">
      <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center border border-[var(--border-strong)] bg-[var(--surface)] transition-colors">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        {checked && <Check size={11} strokeWidth={3} className="text-[var(--primary)]" aria-hidden="true" />}
      </span>
      {swatch && (
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--border-strong)]"
          style={{ background: swatch }}
          aria-hidden="true"
        />
      )}
      <span className={checked ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}>{label}</span>
    </label>
  );
}

const COLOR_HEX = {
  'Forest Green': '#1F3D2F', Ivory: '#F6F1E7', 'Soft Cream': '#EFE7D8', Sand: '#DCCDB4',
  'Muted Taupe': '#A99781', Terracotta: '#B5654A', 'Muted Rose': '#C08C86', Emerald: '#146B4F',
  Charcoal: '#33332F', Sage: '#9BAA92',
};

const DISCOUNTS = [
  { value: '10', label: '10% and above' },
  { value: '20', label: '20% and above' },
  { value: '30', label: '30% and above' },
];

/**
 * Shared facet UI. Rendered inline as a sidebar on desktop and inside a
 * bottom/side drawer on mobile.
 */
export function FilterPanel({ facets, values, onToggle, onSet, onClear, activeCount }) {
  if (!facets) return null;
  const { min = 0, max = 100000 } = facets.priceRange || {};

  const has = (key, v) => (values[key] || '').split(',').filter(Boolean).includes(v);

  return (
    <div>
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <h2 className="eyebrow-sm">Filters{activeCount ? ` (${activeCount})` : ''}</h2>
        {activeCount > 0 && (
          <button type="button" onClick={onClear} className="text-xs text-[var(--text-muted)] link-underline">
            Clear all
          </button>
        )}
      </div>

      <Group title="Category">
        {facets.categories?.map((c) => (
          <CheckRow
            key={c.slug}
            label={c.name}
            checked={has('category', c.slug)}
            onChange={() => onToggle('category', c.slug)}
          />
        ))}
      </Group>

      <Group title="Price">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="minPrice">Minimum price</label>
            <input
              id="minPrice"
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              placeholder={String(min)}
              value={values.minPrice || ''}
              onChange={(e) => onSet('minPrice', e.target.value)}
              className="field w-full"
            />
            <span className="text-[var(--text-muted)]" aria-hidden="true">–</span>
            <label className="sr-only" htmlFor="maxPrice">Maximum price</label>
            <input
              id="maxPrice"
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              placeholder={String(max)}
              value={values.maxPrice || ''}
              onChange={(e) => onSet('maxPrice', e.target.value)}
              className="field w-full"
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Catalogue range {formatPrice(min)} – {formatPrice(max)}
          </p>
        </div>
      </Group>

      <Group title="Size">
        <div className="flex flex-wrap gap-2">
          {facets.sizes?.map((s) => {
            const active = has('size', s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => onToggle('size', s)}
                className={`min-w-[2.75rem] border px-3 py-2 text-xs transition-colors ${
                  active
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--text-inverse)]'
                    : 'border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--text)]'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Colour" defaultOpen={false}>
        {facets.colors?.map((c) => (
          <CheckRow
            key={c}
            label={c}
            swatch={COLOR_HEX[c] || '#CFC6B8'}
            checked={has('color', c)}
            onChange={() => onToggle('color', c)}
          />
        ))}
      </Group>

      <Group title="Fabric" defaultOpen={false}>
        {facets.fabrics?.map((f) => (
          <CheckRow key={f} label={f} checked={has('fabric', f)} onChange={() => onToggle('fabric', f)} />
        ))}
      </Group>

      <Group title="Availability" defaultOpen={false}>
        {[
          { value: 'in_stock', label: 'In stock' },
          { value: 'out_of_stock', label: 'Sold out' },
        ].map((o) => (
          <CheckRow
            key={o.value}
            label={o.label}
            checked={values.availability === o.value}
            onChange={() => onSet('availability', values.availability === o.value ? '' : o.value)}
          />
        ))}
      </Group>

      <Group title="Discount" defaultOpen={false}>
        {DISCOUNTS.map((d) => (
          <CheckRow
            key={d.value}
            label={d.label}
            checked={values.minDiscount === d.value}
            onChange={() => onSet('minDiscount', values.minDiscount === d.value ? '' : d.value)}
          />
        ))}
        <CheckRow
          label="On sale only"
          checked={values.onSale === 'true'}
          onChange={() => onSet('onSale', values.onSale === 'true' ? '' : 'true')}
        />
      </Group>
    </div>
  );
}

/** Mobile drawer wrapper — slides up from the bottom, thumb-reachable actions. */
export function FilterDrawer({ open, onClose, resultCount, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(21,41,31,0.42)] backdrop-blur-[2px]"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col bg-[var(--surface)] outline-none"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <h2 className="display-sm">Filter</h2>
              <button type="button" onClick={onClose} aria-label="Close filters" className="icon-btn">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>

            <div className="border-t border-[var(--border)] bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={onClose} className="btn btn-primary w-full">
                Show {resultCount != null ? `${resultCount} ` : ''}results
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
