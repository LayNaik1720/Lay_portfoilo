/**
 * Small shared UI primitives: images, states, badges, prices, modals.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ImageOff, PackageX, SearchX, AlertTriangle } from 'lucide-react';
import { formatPrice, discountPercent } from '../../lib/format.js';

/* ------------------------------------------------------------------ image -- */

/**
 * Lazy, aspect-ratio-locked image with a graceful fallback.
 * All storefront imagery goes through here.
 */
export function SmartImage({
  src, alt = '', ratio = '3/4', className = '', imgClassName = '',
  priority = false, sizes, objectPosition = 'center',
}) {
  const [status, setStatus] = useState('loading');

  return (
    <div
      className={`relative overflow-hidden bg-[var(--surface-muted)] ${className}`}
      style={{ aspectRatio: ratio }}
    >
      {status === 'loading' && <div className="absolute inset-0 skeleton" aria-hidden="true" />}

      {status !== 'error' && src ? (
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`h-full w-full object-cover transition-opacity duration-700 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
          style={{ objectPosition }}
        />
      ) : null}

      {(status === 'error' || !src) && (
        <div className="absolute inset-0 grid place-items-center text-[var(--text-muted)]">
          <ImageOff size={22} strokeWidth={1.2} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ price -- */

export function PriceDisplay({ price, originalPrice, size = 'md', className = '' }) {
  const pct = discountPercent(price, originalPrice);
  const sizes = {
    sm: { now: 'text-sm', was: 'text-xs', off: 'text-[0.625rem]' },
    md: { now: 'text-[0.9375rem]', was: 'text-xs', off: 'text-[0.625rem]' },
    lg: { now: 'text-2xl', was: 'text-base', off: 'text-xs' },
  }[size];

  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      <span className={`${sizes.now} font-medium tracking-tight`}>{formatPrice(price)}</span>
      {pct > 0 && (
        <>
          <span className={`${sizes.was} text-[var(--text-muted)] line-through`}>{formatPrice(originalPrice)}</span>
          <span className={`${sizes.off} font-semibold tracking-wider text-[var(--sale)]`}>{pct}% OFF</span>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ badge -- */

export function StockBadge({ stock, threshold = 3, className = '' }) {
  if (stock <= 0) {
    return <span className={`badge bg-[#f6eeec] text-[var(--error)] ${className}`}>Out of stock</span>;
  }
  if (stock <= threshold) {
    return <span className={`badge bg-[#f9f2e6] text-[var(--warning)] ${className}`}>Only {stock} left</span>;
  }
  return <span className={`badge bg-[#eef3ee] text-[var(--success)] ${className}`}>In stock</span>;
}

export function Badge({ children, tone = 'neutral', className = '' }) {
  const tones = {
    neutral: 'bg-[var(--surface-muted)] text-[var(--text-muted)]',
    dark: 'bg-[var(--primary)] text-[var(--text-inverse)]',
    sale: 'bg-[var(--sale)] text-white',
    success: 'bg-[#eef3ee] text-[var(--success)]',
    error: 'bg-[#f6eeec] text-[var(--error)]',
    info: 'bg-[#eceff2] text-[#3f5668]',
    muted: 'bg-[var(--surface-muted)] text-[var(--text-muted)]',
    gold: 'bg-[#f5efe2] text-[var(--color-gold)]',
  };
  return <span className={`badge ${tones[tone] || tones.neutral} ${className}`}>{children}</span>;
}

/* ----------------------------------------------------------------- states -- */

export function LoadingSkeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <LoadingSkeleton className="w-full" style={{ aspectRatio: '3/4' }} />
      <LoadingSkeleton className="h-3 w-3/4" />
      <LoadingSkeleton className="h-3 w-1/3" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 md:gap-x-6 md:gap-y-12">
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}

export function EmptyState({
  icon: Icon = PackageX, title, description, action, className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-20 text-center ${className}`}>
      <Icon size={32} strokeWidth={1} className="mb-5 text-[var(--text-muted)]" aria-hidden="true" />
      <h3 className="display-sm mb-2">{title}</h3>
      {description && <p className="max-w-md text-sm text-[var(--text-muted)]">{description}</p>}
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className = '' }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      description={error?.message || 'We could not load this content. Please try again.'}
      className={className}
      action={onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-outline">Try again</button>
      )}
    />
  );
}

export function NoResults({ onClear }) {
  return (
    <EmptyState
      icon={SearchX}
      title="Nothing matches yet"
      description="Try removing a filter or searching for something broader."
      action={onClear && <button type="button" onClick={onClear} className="btn btn-outline">Clear filters</button>}
    />
  );
}

/* ------------------------------------------------------------------ modal -- */

export function Modal({ open, onClose, children, label, maxWidth = 'max-w-lg' }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={label}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-[rgba(28,33,29,0.55)] backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto bg-[var(--surface)] shadow-xl`}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center text-[var(--text-muted)] transition hover:text-[var(--text)]"
            >
              <X size={18} />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------- heading -- */

export function SectionHeading({ eyebrow, title, subtitle, action, align = 'left', className = '' }) {
  return (
    <div className={`flex flex-col gap-5 ${align === 'center' ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'} ${className}`}>
      <div className={align === 'center' ? 'max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && <p className="eyebrow mb-3 text-[var(--accent)]">{eyebrow}</p>}
        <h2 className="display-lg">{title}</h2>
        {subtitle && <p className="body-lg mt-4 text-balance">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------- animations -- */

/** Fade-and-rise on scroll into view. */
export function Reveal({ children, delay = 0, y = 24, className = '', once = true }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className = '', delay = 0, gap = 0.08 }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={{ visible: { transition: { staggerChildren: gap, delayChildren: delay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

export function Rating({ value = 0, count, size = 12, className = '' }) {
  const rounded = Math.round(value);
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} width={size} height={size} viewBox="0 0 20 20" className="shrink-0">
            <path
              d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9 4.8 17.6l1-5.8L1.5 7.7l5.9-.9z"
              fill={i <= rounded ? 'var(--color-gold)' : 'none'}
              stroke={i <= rounded ? 'var(--color-gold)' : 'var(--border-strong)'}
              strokeWidth="1.2"
            />
          </svg>
        ))}
      </span>
      <span className="sr-only">{value} out of 5 stars</span>
      {count !== undefined && (
        <span className="text-[0.6875rem] text-[var(--text-muted)]">({count})</span>
      )}
    </div>
  );
}
