import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Truck, Save, User, MapPin } from 'lucide-react';
import { AdminPageHeader, FormField, SaveButton } from '../../components/admin/AdminUI.jsx';
import { OrderTracker } from '../../components/OrderTracker.jsx';
import {
  SmartImage, Badge, LoadingSkeleton, ErrorState,
} from '../../components/ui/Primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import {
  formatPrice, formatDate, formatDateTime, ORDER_STATUS_LABELS, statusTone,
} from '../../lib/format.js';

export default function AdminOrderDetail() {
  const { id } = useParams();
  const { data, loading, error, refetch } = useFetch(`/admin/orders/${id}`);
  const toast = useToast();

  const [nextStatus, setNextStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [fulfilment, setFulfilment] = useState({ trackingNumber: '', courier: '', adminNote: '' });
  const [statusBusy, setStatusBusy] = useState(false);
  const [detailsBusy, setDetailsBusy] = useState(false);

  const order = data?.order;
  const tracker = data?.tracker || [];
  const allowed = data?.allowedTransitions || [];

  useSeo({ title: order ? `Order ${order.orderNumber}` : 'Order', noIndex: true });

  useEffect(() => {
    if (!order) return;
    setFulfilment({
      trackingNumber: order.trackingNumber || '',
      courier: order.courier || '',
      adminNote: order.adminNote || '',
    });
    setNextStatus('');
    setStatusNote('');
  }, [order?._id, order?.status]);

  const updateStatus = async (e) => {
    e.preventDefault();
    if (!nextStatus) return;
    setStatusBusy(true);
    try {
      await api.put(`/admin/orders/${id}/status`, {
        status: nextStatus,
        note: statusNote,
        trackingNumber: fulfilment.trackingNumber || undefined,
        courier: fulfilment.courier || undefined,
      });
      toast.success(`Order marked ${ORDER_STATUS_LABELS[nextStatus] || nextStatus}.`);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not update the order status.');
    } finally {
      setStatusBusy(false);
    }
  };

  const saveDetails = async (e) => {
    e.preventDefault();
    setDetailsBusy(true);
    try {
      await api.patch(`/admin/orders/${id}`, fulfilment);
      toast.success('Order details saved.');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not save those details.');
    } finally {
      setDetailsBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-10 w-64" />
        <LoadingSkeleton className="h-80 w-full" />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!order) return null;

  return (
    <>
      <Link to="/admin/orders" className="mb-5 inline-flex items-center gap-2 text-sm link-underline">
        <ChevronLeft size={14} /> All orders
      </Link>

      <AdminPageHeader
        title={order.orderNumber}
        description={`Placed ${formatDateTime(order.createdAt)}`}
        action={<Badge tone={statusTone(order.status)}>{ORDER_STATUS_LABELS[order.status] || order.status}</Badge>}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_21rem]">
        <div className="min-w-0 space-y-5">
          {/* ---- tracker */}
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="track-heading">
            <h2 id="track-heading" className="display-sm mb-6">Fulfilment progress</h2>
            <OrderTracker tracker={tracker} status={order.status} />
          </section>

          {/* ---- items */}
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="items-heading">
            <h2 id="items-heading" className="display-sm mb-4">Items</h2>
            <ul className="divide-y divide-[var(--border)]">
              {order.items.map((item) => (
                <li key={item._id} className="flex gap-4 py-3.5 first:pt-0 last:pb-0">
                  <div className="w-12 shrink-0">
                    <SmartImage src={item.image} alt="" ratio="3/4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">
                      <Link to={`/product/${item.slug}`} target="_blank" className="link-underline">
                        {item.name}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {item.sku}
                      {(item.size || item.color) && ` · ${[item.size, item.color].filter(Boolean).join(' · ')}`}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm tabular-nums">{formatPrice(item.lineTotal)}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-[var(--border)] pt-4 text-sm">
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
                <dd className="tabular-nums">{order.shippingFee > 0 ? formatPrice(order.shippingFee) : 'Free'}</dd>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-2 text-base">
                <dt className="font-medium">Total</dt>
                <dd className="font-medium tabular-nums">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>

          {/* ---- history */}
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="history-heading">
            <h2 id="history-heading" className="display-sm mb-4">Status history</h2>
            <ol className="space-y-2.5 border-l border-[var(--border)] pl-5">
              {order.statusHistory.map((event, i) => (
                <li key={`${event.status}-${i}`} className="relative text-sm">
                  <span
                    className="absolute -left-[1.4375rem] top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--border-strong)]"
                    aria-hidden="true"
                  />
                  <span className="font-medium">{ORDER_STATUS_LABELS[event.status] || event.status}</span>
                  {event.note && <span className="text-[var(--text-muted)]"> — {event.note}</span>}
                  <span className="block text-xs text-[var(--text-muted)]">
                    {formatDateTime(event.at)} · by {event.by}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* ---- sidebar */}
        <aside className="space-y-5">
          {/* status */}
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="display-sm mb-4">Update status</h2>

            {allowed.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                This order has reached a final state — no further transitions are possible.
              </p>
            ) : (
              <form onSubmit={updateStatus} className="space-y-4">
                <FormField label="Move to" htmlFor="next-status" hint="Only valid next steps are listed.">
                  <select
                    id="next-status" className="field"
                    value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}
                    required
                  >
                    <option value="">Choose a status</option>
                    {allowed.map((s) => (
                      <option key={s} value={s}>{ORDER_STATUS_LABELS[s] || s}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Note" htmlFor="status-note" hint="Visible to the customer in their order history.">
                  <input
                    id="status-note" className="field" maxLength={400}
                    value={statusNote} onChange={(e) => setStatusNote(e.target.value)}
                  />
                </FormField>

                <SaveButton busy={statusBusy} disabled={!nextStatus || statusBusy}>
                  Update status
                </SaveButton>

                {nextStatus === 'cancelled' && (
                  <p className="text-xs text-[var(--warning)]">
                    Cancelling returns every item in this order to stock.
                  </p>
                )}
              </form>
            )}
          </section>

          {/* shipping */}
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="display-sm mb-4">Shipping & notes</h2>
            <form onSubmit={saveDetails} className="space-y-4">
              <FormField label="Courier" htmlFor="courier">
                <input
                  id="courier" className="field" value={fulfilment.courier}
                  onChange={(e) => setFulfilment({ ...fulfilment, courier: e.target.value })}
                  placeholder="Bluedart, Delhivery…"
                />
              </FormField>
              <FormField label="Tracking number" htmlFor="tracking">
                <input
                  id="tracking" className="field" value={fulfilment.trackingNumber}
                  onChange={(e) => setFulfilment({ ...fulfilment, trackingNumber: e.target.value })}
                />
              </FormField>
              <FormField label="Internal note" htmlFor="admin-note" hint="Staff only — never shown to the customer.">
                <textarea
                  id="admin-note" className="field" rows={3} value={fulfilment.adminNote}
                  onChange={(e) => setFulfilment({ ...fulfilment, adminNote: e.target.value })}
                />
              </FormField>
              <button type="submit" className="btn btn-outline btn-sm" disabled={detailsBusy}>
                <Save size={13} /> {detailsBusy ? 'Saving…' : 'Save details'}
              </button>
            </form>
          </section>

          {/* customer */}
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="eyebrow-sm mb-3 flex items-center gap-2 text-[var(--text-muted)]">
              <User size={13} aria-hidden="true" /> Customer
            </h2>
            <p className="text-sm font-medium">{order.customer.name}</p>
            <p className="mt-0.5 text-sm">
              <a href={`mailto:${order.customer.email}`} className="link-underline">{order.customer.email}</a>
            </p>
            <p className="mt-0.5 text-sm">
              <a href={`tel:${order.customer.mobile}`} className="link-underline">{order.customer.mobile}</a>
            </p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {order.user ? 'Registered account' : 'Guest checkout'}
            </p>

            <h3 className="eyebrow-sm mb-2 mt-5 flex items-center gap-2 text-[var(--text-muted)]">
              <MapPin size={13} aria-hidden="true" /> Ship to
            </h3>
            <address className="text-sm not-italic leading-relaxed">
              {order.shippingAddress.fullName}<br />
              {[order.shippingAddress.house, order.shippingAddress.street, order.shippingAddress.area]
                .filter(Boolean).join(', ')}<br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}<br />
              {order.shippingAddress.country}
            </address>

            {order.customerNote && (
              <p className="mt-4 border-t border-[var(--border)] pt-3 text-xs">
                <span className="block font-medium">Customer note</span>
                <span className="text-[var(--text-muted)]">{order.customerNote}</span>
              </p>
            )}
          </section>

          {/* payment */}
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="eyebrow-sm mb-3 flex items-center gap-2 text-[var(--text-muted)]">
              <Truck size={13} aria-hidden="true" /> Payment
            </h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Method</dt>
                <dd className="uppercase">{order.paymentMethod}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Status</dt>
                <dd className={order.paymentStatus === 'paid' ? 'text-[var(--success)]' : ''}>
                  {order.paymentStatus}
                </dd>
              </div>
              {order.payment?.paidAt && (
                <div className="flex justify-between">
                  <dt className="text-[var(--text-muted)]">Paid on</dt>
                  <dd>{formatDate(order.payment.paidAt)}</dd>
                </div>
              )}
              {order.payment?.paymentId && (
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-[var(--text-muted)]">Reference</dt>
                  <dd className="truncate text-xs">{order.payment.paymentId}</dd>
                </div>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}
