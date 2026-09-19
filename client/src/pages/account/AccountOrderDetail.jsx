import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, MessageCircle, XCircle, RotateCcw, Truck } from 'lucide-react';
import { OrderTracker } from '../../components/OrderTracker.jsx';
import {
  SmartImage, Badge, Modal, ErrorState, LoadingSkeleton,
} from '../../components/ui/Primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useStorefront } from '../../context/StorefrontContext.jsx';
import { api } from '../../lib/api.js';
import {
  formatPrice, formatDate, formatDateTime, ORDER_STATUS_LABELS, statusTone, whatsappLink,
} from '../../lib/format.js';

const CANCELLABLE = ['pending', 'payment_processing', 'payment_confirmed', 'confirmed', 'packed'];

/** Confirmation dialog used for both cancel and return. */
function ActionDialog({ open, onClose, title, description, label, placeholder, onConfirm, danger }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm(reason);
      onClose();
      setReason('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} label={title}>
      <div className="p-6">
        <h2 className="display-sm mb-2">{title}</h2>
        <p className="mb-5 text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>

        <label className="field-label" htmlFor="reason">{label}</label>
        <textarea
          id="reason" className="field" rows={3} maxLength={400}
          value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
        />

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="btn btn-outline flex-1" disabled={busy}>
            Keep it
          </button>
          <button
            type="button" onClick={confirm} disabled={busy}
            className={`btn flex-1 ${danger ? 'btn-accent' : 'btn-primary'}`}
          >
            {busy ? 'Working…' : 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function AccountOrderDetail() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useFetch(`/orders/${id}`);
  const { settings } = useStorefront();
  const toast = useToast();
  const [dialog, setDialog] = useState(null);

  const order = data?.order;
  const tracker = data?.tracker || [];

  useSeo({ title: order ? `Order ${order.orderNumber}` : 'Order', noIndex: true });

  const cancel = async (reason) => {
    try {
      await api.post(`/orders/${id}/cancel`, { reason });
      toast.success('Order cancelled. Any payment will be refunded.');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not cancel this order.');
    }
  };

  const requestReturn = async (reason) => {
    try {
      await api.post(`/orders/${id}/return`, { reason });
      toast.success('Return requested. We’ll be in touch shortly.');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not request a return.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-8 w-48" />
        <LoadingSkeleton className="h-28 w-full" />
        <LoadingSkeleton className="h-64 w-full" />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!order) return null;

  const waNumber = settings?.contact?.whatsapp;
  const canCancel = CANCELLABLE.includes(order.status);
  const canReturn = order.status === 'delivered';

  return (
    <div>
      <Link to="/account/orders" className="mb-6 inline-flex items-center gap-2 text-sm link-underline">
        <ChevronLeft size={14} /> All orders
      </Link>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display-lg">{order.orderNumber}</h1>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Placed {formatDateTime(order.createdAt)}
          </p>
        </div>
        <Badge tone={statusTone(order.status)}>
          {ORDER_STATUS_LABELS[order.status] || order.status}
        </Badge>
      </header>

      {/* ---- tracker */}
      <section className="mb-10 border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6" aria-labelledby="track-heading">
        <h2 id="track-heading" className="display-sm mb-6">Delivery progress</h2>
        <OrderTracker tracker={tracker} status={order.status} />

        {order.trackingNumber && (
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-5 text-sm">
            <Truck size={15} className="text-[var(--text-muted)]" aria-hidden="true" />
            <span className="text-[var(--text-muted)]">
              {order.courier || 'Courier'} · Tracking
            </span>
            <span className="font-medium">{order.trackingNumber}</span>
          </div>
        )}
      </section>

      {/* ---- items */}
      <section className="mb-10" aria-labelledby="items-heading">
        <h2 id="items-heading" className="display-sm mb-4">Items</h2>
        <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {order.items.map((item) => (
            <li key={item._id} className="flex gap-4 py-4">
              <Link to={`/product/${item.slug}`} className="w-16 shrink-0">
                <SmartImage src={item.image} alt={item.name} ratio="3/4" />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">
                  <Link to={`/product/${item.slug}`} className="link-underline">{item.name}</Link>
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {[item.size, item.color].filter(Boolean).join(' · ')}
                  {(item.size || item.color) ? ' · ' : ''}SKU {item.sku}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {formatPrice(item.unitPrice)} × {item.quantity}
                </p>
              </div>
              <p className="shrink-0 text-sm tabular-nums">{formatPrice(item.lineTotal)}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- totals + address */}
      <div className="mb-10 grid gap-6 md:grid-cols-2">
        <section aria-labelledby="totals-heading" className="border border-[var(--border)] p-5">
          <h2 id="totals-heading" className="eyebrow-sm mb-4 text-[var(--text-muted)]">Payment summary</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--text-muted)]">Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-[var(--success)]">
                <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
                <dd className="tabular-nums">−{formatPrice(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-[var(--text-muted)]">Shipping</dt>
              <dd className="tabular-nums">
                {order.shippingFee > 0 ? formatPrice(order.shippingFee) : 'Free'}
              </dd>
            </div>
            <div className="flex justify-between border-t border-[var(--border)] pt-2.5 text-base">
              <dt className="font-medium">Total</dt>
              <dd className="font-medium tabular-nums">{formatPrice(order.total)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            {order.paymentMethod === 'cod' ? 'Cash on delivery' : order.paymentMethod.toUpperCase()}
            {' · '}
            {order.paymentStatus === 'paid' ? 'Paid' : 'Payment pending'}
            {order.payment?.paidAt ? ` on ${formatDate(order.payment.paidAt)}` : ''}
          </p>
        </section>

        <section aria-labelledby="address-heading" className="border border-[var(--border)] p-5">
          <h2 id="address-heading" className="eyebrow-sm mb-4 text-[var(--text-muted)]">Shipping to</h2>
          <address className="text-sm not-italic leading-relaxed">
            <strong className="font-medium">{order.shippingAddress.fullName}</strong><br />
            {[order.shippingAddress.house, order.shippingAddress.street, order.shippingAddress.area]
              .filter(Boolean).join(', ')}<br />
            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}<br />
            {order.shippingAddress.country}<br />
            <span className="text-[var(--text-muted)]">{order.shippingAddress.mobile}</span>
          </address>
          {order.customerNote && (
            <p className="mt-4 border-t border-[var(--border)] pt-4 text-xs text-[var(--text-muted)]">
              <span className="block font-medium text-[var(--text)]">Your note</span>
              {order.customerNote}
            </p>
          )}
        </section>
      </div>

      {/* ---- history */}
      {order.statusHistory?.length > 0 && (
        <section className="mb-10" aria-labelledby="history-heading">
          <h2 id="history-heading" className="display-sm mb-4">Order history</h2>
          <ol className="space-y-2.5 border-l border-[var(--border)] pl-5">
            {order.statusHistory.map((event, i) => (
              <li key={`${event.status}-${i}`} className="relative text-sm">
                <span
                  className="absolute -left-[1.4375rem] top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--border-strong)]"
                  aria-hidden="true"
                />
                <span>{ORDER_STATUS_LABELS[event.status] || event.status}</span>
                {event.note && <span className="text-[var(--text-muted)]"> — {event.note}</span>}
                <span className="block text-xs text-[var(--text-muted)]">{formatDateTime(event.at)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ---- actions */}
      <div className="flex flex-wrap gap-3 border-t border-[var(--border)] pt-6">
        {canCancel && (
          <button type="button" className="btn btn-outline" onClick={() => setDialog('cancel')}>
            <XCircle size={14} /> Cancel order
          </button>
        )}
        {canReturn && (
          <button type="button" className="btn btn-outline" onClick={() => setDialog('return')}>
            <RotateCcw size={14} /> Request a return
          </button>
        )}
        {waNumber && (
          <a
            href={whatsappLink(waNumber, `Hello! I have a question about order ${order.orderNumber}.`)}
            target="_blank" rel="noreferrer noopener"
            className="btn btn-outline"
          >
            <MessageCircle size={14} /> Need help?
          </a>
        )}
      </div>

      <ActionDialog
        open={dialog === 'cancel'}
        onClose={() => setDialog(null)}
        title="Cancel this order?"
        description="Stock goes straight back to the shelf and any payment is refunded within 5–7 business days."
        label="Reason (optional)"
        placeholder="Changed my mind, ordered the wrong size…"
        onConfirm={cancel}
        danger
      />

      <ActionDialog
        open={dialog === 'return'}
        onClose={() => setDialog(null)}
        title="Request a return"
        description={`Returns are accepted within ${settings?.shipping?.returnWindowDays ?? 7} days of delivery, on unworn items with tags attached.`}
        label="Why are you returning it?"
        placeholder="Didn’t fit, not as expected…"
        onConfirm={requestReturn}
      />
    </div>
  );
}
