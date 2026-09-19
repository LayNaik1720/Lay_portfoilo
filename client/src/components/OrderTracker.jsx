import { Check, Package, Truck, Home, CreditCard, ClipboardCheck, XCircle, RotateCcw } from 'lucide-react';
import { ORDER_STATUS_LABELS, formatDateTime } from '../lib/format.js';

const STEP_ICONS = {
  pending: ClipboardCheck,
  payment_processing: CreditCard,
  confirmed: Check,
  packed: Package,
  shipped: Truck,
  out_for_delivery: Truck,
  delivered: Home,
  cancelled: XCircle,
  returned: RotateCcw,
};

const TERMINAL_BAD = ['cancelled', 'payment_failed', 'return_requested', 'returned', 'refunded'];

/**
 * Horizontal progress tracker on desktop, vertical timeline on mobile —
 * six labels never fit side by side on a 360px screen.
 */
export function OrderTracker({ tracker = [], status }) {
  if (TERMINAL_BAD.includes(status)) {
    const Icon = STEP_ICONS[status] || XCircle;
    const isReturn = status.startsWith('return') || status === 'refunded';
    return (
      <div className={`flex items-start gap-3 border px-4 py-4 ${
        isReturn ? 'border-[var(--border-strong)] bg-[var(--surface-muted)]' : 'border-[var(--error)] bg-[#f9efec]'
      }`}>
        <Icon size={18} className={isReturn ? 'text-[var(--text-muted)]' : 'text-[var(--error)]'} aria-hidden="true" />
        <div>
          <p className="text-sm font-medium">{ORDER_STATUS_LABELS[status] || status}</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {isReturn
              ? 'We are processing this return. Refunds reach your account in 5–7 business days.'
              : 'This order is no longer being fulfilled. Any payment made will be refunded.'}
          </p>
        </div>
      </div>
    );
  }

  if (!tracker.length) return null;

  return (
    <div>
      {/* ---------------------------------------------------------- mobile */}
      <ol className="md:hidden">
        {tracker.map((step, i) => {
          const Icon = STEP_ICONS[step.status] || Check;
          const last = i === tracker.length - 1;
          return (
            <li key={step.status} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors ${
                  step.reached
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--text-inverse)]'
                    : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-muted)]'
                }`}>
                  <Icon size={14} aria-hidden="true" />
                </span>
                {!last && (
                  <span className={`w-px flex-1 ${step.reached ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
                )}
              </div>
              <div className={`pb-6 ${last ? 'pb-0' : ''}`}>
                <p className={`text-sm ${step.current ? 'font-medium' : ''} ${step.reached ? '' : 'text-[var(--text-muted)]'}`}>
                  {ORDER_STATUS_LABELS[step.status] || step.status}
                </p>
                {step.at && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{formatDateTime(step.at)}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {/* --------------------------------------------------------- desktop */}
      <ol className="hidden md:flex md:items-start">
        {tracker.map((step, i) => {
          const Icon = STEP_ICONS[step.status] || Check;
          const last = i === tracker.length - 1;
          return (
            <li key={step.status} className={`flex min-w-0 ${last ? '' : 'flex-1'}`}>
              <div className="flex min-w-0 flex-col items-center px-1 text-center">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors ${
                  step.reached
                    ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--text-inverse)]'
                    : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-muted)]'
                }`}>
                  <Icon size={15} aria-hidden="true" />
                </span>
                <p className={`mt-2.5 text-xs leading-tight ${step.current ? 'font-medium' : ''} ${step.reached ? '' : 'text-[var(--text-muted)]'}`}>
                  {ORDER_STATUS_LABELS[step.status] || step.status}
                </p>
                {step.at && (
                  <p className="mt-1 text-[0.6875rem] text-[var(--text-muted)]">
                    {formatDateTime(step.at)}
                  </p>
                )}
              </div>
              {!last && (
                <span
                  className={`mt-[1.125rem] h-px min-w-6 flex-1 ${
                    tracker[i + 1].reached ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
