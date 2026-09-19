import { useState } from 'react';
import { Tag, X, Truck, Check } from 'lucide-react';
import { formatPrice } from '../lib/format.js';
import { useCart } from '../context/CartContext.jsx';

/** Progress toward the admin-configured free-shipping threshold. */
export function FreeShippingBar({ totals, className = '' }) {
  const threshold = totals?.freeShippingThreshold || 0;
  if (!threshold) return null;

  const remaining = totals.amountToFreeShipping ?? 0;
  const qualifies = totals.qualifiesForFreeShipping || remaining <= 0;
  const pct = qualifies ? 100 : Math.min(100, Math.max(4, ((threshold - remaining) / threshold) * 100));

  return (
    <div className={className}>
      <p className="mb-2 flex items-center gap-2 text-xs">
        {qualifies ? (
          <>
            <Check size={14} className="text-[var(--success)]" aria-hidden="true" />
            <span className="text-[var(--success)]">You’ve unlocked free shipping</span>
          </>
        ) : (
          <>
            <Truck size={14} className="text-[var(--text-muted)]" aria-hidden="true" />
            <span className="text-[var(--text-muted)]">
              Add <strong className="font-medium text-[var(--text)]">{formatPrice(remaining)}</strong> more for free shipping
            </span>
          </>
        )}
      </p>
      <div
        className="h-1 w-full bg-[var(--border)]"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress to free shipping"
      >
        <div
          className="h-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ width: `${pct}%`, background: qualifies ? 'var(--success)' : 'var(--primary)' }}
        />
      </div>
    </div>
  );
}

/** Coupon entry with server-side validation feedback. */
export function CouponField() {
  const { totals, applyCoupon, removeCoupon, busy } = useCart();
  const [code, setCode] = useState('');
  const applied = totals?.couponCode;

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    const ok = await applyCoupon(code.trim().toUpperCase());
    if (ok) setCode('');
  };

  if (applied) {
    return (
      <div className="flex items-center justify-between border border-dashed border-[var(--success)] bg-[#f2f6f2] px-3.5 py-3">
        <span className="inline-flex items-center gap-2 text-sm">
          <Tag size={14} className="text-[var(--success)]" aria-hidden="true" />
          <span className="font-medium">{applied}</span>
          <span className="text-[var(--text-muted)]">applied</span>
        </span>
        <button
          type="button"
          onClick={removeCoupon}
          disabled={busy}
          className="icon-btn h-7 w-7 text-[var(--text-muted)]"
          aria-label="Remove coupon"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="coupon">Have a code?</label>
      <div className="flex gap-2">
        <input
          id="coupon"
          className="field field-sm flex-1 uppercase"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="WELCOME10"
          autoComplete="off"
          aria-invalid={totals?.couponError ? 'true' : undefined}
        />
        <button type="submit" className="btn btn-outline btn-sm shrink-0" disabled={busy || !code.trim()}>
          Apply
        </button>
      </div>
      {totals?.couponError && <p className="field-error" role="alert">{totals.couponError}</p>}
    </form>
  );
}

/**
 * Totals panel used on the cart and checkout pages.
 * `action` is the primary CTA supplied by the parent.
 */
export function OrderSummary({ totals, action, showCoupon = true, note, children }) {
  if (!totals) return null;

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
      <h2 className="display-sm mb-5">Order summary</h2>

      {showCoupon && (
        <div className="mb-5 border-b border-[var(--border)] pb-5">
          <CouponField />
        </div>
      )}

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-[var(--text-muted)]">Subtotal</dt>
          <dd className="tabular-nums">{formatPrice(totals.subtotal)}</dd>
        </div>

        {totals.discount > 0 && (
          <div className="flex justify-between text-[var(--success)]">
            <dt>Discount{totals.couponCode ? ` (${totals.couponCode})` : ''}</dt>
            <dd className="tabular-nums">−{formatPrice(totals.discount)}</dd>
          </div>
        )}

        <div className="flex justify-between">
          <dt className="text-[var(--text-muted)]">Shipping</dt>
          <dd className="tabular-nums">
            {totals.shippingFee > 0 ? formatPrice(totals.shippingFee) : <span className="text-[var(--success)]">Free</span>}
          </dd>
        </div>

        {totals.codCharge > 0 && (
          <div className="flex justify-between">
            <dt className="text-[var(--text-muted)]">Cash on delivery fee</dt>
            <dd className="tabular-nums">{formatPrice(totals.codCharge)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5 flex items-baseline justify-between border-t border-[var(--border)] pt-5">
        <span className="text-sm font-medium">Total</span>
        <span className="font-[var(--font-display)] text-2xl font-light tabular-nums">
          {formatPrice(totals.total)}
        </span>
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Inclusive of all taxes</p>

      <FreeShippingBar totals={totals} className="mt-5" />

      {action && <div className="mt-6">{action}</div>}
      {note && <p className="mt-3 text-center text-xs text-[var(--text-muted)]">{note}</p>}
      {children}
    </div>
  );
}
