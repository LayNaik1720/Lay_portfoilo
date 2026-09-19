/**
 * Shared admin building blocks.
 *
 * The table helper is deliberately "cards on mobile, table on desktop":
 * admin data has too many columns to squeeze into 360px, so below `md`
 * each row renders as a labelled stack instead.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, X, ChevronLeft, ChevronRight, Inbox, AlertCircle, Loader2,
} from 'lucide-react';
import { LoadingSkeleton } from '../ui/Primitives.jsx';

/* ------------------------------------------------------------ page header -- */

export function AdminPageHeader({ title, description, action, children }) {
  return (
    <header className="mb-6 md:mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-[var(--font-display)] text-3xl font-light leading-tight md:text-4xl">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-[var(--text-muted)]">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------- stat -- */

export function StatCard({ label, value, hint, Icon, tone = 'default' }) {
  const tones = {
    default: 'text-[var(--text)]',
    success: 'text-[var(--success)]',
    warning: 'text-[var(--warning)]',
    error: 'text-[var(--error)]',
  };
  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="eyebrow-sm text-[var(--text-muted)]">{label}</span>
        {Icon && <Icon size={15} strokeWidth={1.4} className="shrink-0 text-[var(--text-muted)]" aria-hidden="true" />}
      </div>
      <p className={`font-[var(--font-display)] text-3xl font-light leading-none tabular-nums ${tones[tone]}`}>
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- toolbar -- */

export function AdminToolbar({ search, onSearch, placeholder = 'Search…', children }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2.5">
      {onSearch && (
        <div className="relative min-w-[12rem] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <label className="sr-only" htmlFor="admin-search">{placeholder}</label>
          <input
            id="admin-search"
            type="search"
            className="field field-sm pl-9"
            placeholder={placeholder}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      )}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ table -- */

/**
 * @param columns {Array<{key, header, render?, className?, hideOnMobile?}>}
 * @param rows    {Array<object>}
 */
export function AdminTable({
  columns, rows, loading, error, emptyTitle = 'Nothing here yet',
  emptyDescription, emptyAction, rowKey = (r) => r._id, onRowClick, skeletonRows = 6,
}) {
  if (loading) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: skeletonRows }, (_, i) => (
          <LoadingSkeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center border border-[var(--border)] px-6 py-14 text-center">
        <AlertCircle size={26} strokeWidth={1.1} className="mb-4 text-[var(--error)]" aria-hidden="true" />
        <p className="text-sm font-medium">Could not load this data</p>
        <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">{error.message}</p>
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="flex flex-col items-center border border-dashed border-[var(--border-strong)] px-6 py-16 text-center">
        <Inbox size={28} strokeWidth={1} className="mb-4 text-[var(--text-muted)]" aria-hidden="true" />
        <p className="text-sm font-medium">{emptyTitle}</p>
        {emptyDescription && <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">{emptyDescription}</p>}
        {emptyAction && <div className="mt-6">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <>
      {/* ---------------------------------------------------------- mobile */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className={`border border-[var(--border)] bg-[var(--surface)] p-4 ${onRowClick ? 'cursor-pointer' : ''}`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            <dl className="space-y-2">
              {columns.filter((c) => !c.hideOnMobile).map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-4">
                  <dt className="eyebrow-sm shrink-0 text-[var(--text-muted)]">{col.header}</dt>
                  <dd className="min-w-0 text-right text-sm">
                    {col.render ? col.render(row) : row[col.key]}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      {/* --------------------------------------------------------- desktop */}
      <div className="hidden overflow-x-auto border border-[var(--border)] md:block">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)] ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-[var(--border)] bg-[var(--surface)] last:border-b-0 transition-colors hover:bg-[var(--surface-muted)] ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 align-middle ${col.className || ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ------------------------------------------------------------- pagination -- */

export function AdminPagination({ meta, page, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
      <p className="text-xs text-[var(--text-muted)]">
        {meta.total} result{meta.total === 1 ? '' : 's'} · page {meta.page} of {meta.totalPages}
      </p>
      <div className="flex gap-1.5">
        <button
          type="button" className="icon-btn icon-btn-bordered disabled:opacity-35"
          disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button" className="icon-btn icon-btn-bordered disabled:opacity-35"
          disabled={page >= meta.totalPages} onClick={() => onPage(page + 1)} aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------ side drawer -- */

/** Right-hand drawer used for create/edit forms so context stays visible. */
export function AdminDrawer({ open, onClose, title, children, footer }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(21,41,31,0.45)]"
          />
          <motion.div
            ref={ref}
            tabIndex={-1}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 340 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-[var(--background)] outline-none"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
              <h2 className="display-sm">{title}</h2>
              <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>

            {footer && (
              <div className="border-t border-[var(--border)] bg-[var(--surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ forms -- */

export function FormField({ label, htmlFor, error, hint, className = '', children }) {
  return (
    <div className={className}>
      {label && <label className="field-label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-[var(--text-muted)]">{hint}</p>}
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint, id }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-300 ${
          checked ? 'bg-[var(--primary)]' : 'bg-[var(--border-strong)]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-300 ${
            checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
          }`}
        />
      </button>
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-[var(--text-muted)]">{hint}</span>}
      </span>
    </label>
  );
}

/** Save button that reflects in-flight state. */
export function SaveButton({ busy, children = 'Save', ...props }) {
  return (
    <button type="submit" className="btn btn-primary" disabled={busy} {...props}>
      {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {busy ? 'Saving…' : children}
    </button>
  );
}

/** Two-step delete so a stray click can't destroy data. */
export function ConfirmDelete({ onConfirm, label = 'Delete', className = '' }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const id = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(id);
  }, [armed]);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={`text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--error)] ${className}`}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setArmed(false); onConfirm(); }}
      className={`text-xs font-medium text-[var(--error)] ${className}`}
    >
      Really delete?
    </button>
  );
}
