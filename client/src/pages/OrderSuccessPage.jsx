import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Package, MessageCircle } from 'lucide-react';
import { OrderTracker } from '../components/OrderTracker.jsx';
import { SmartImage, LoadingSkeleton, ErrorState } from '../components/ui/Primitives.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useSeo } from '../hooks/useSeo.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useStorefront } from '../context/StorefrontContext.jsx';
import { formatPrice, formatDate, whatsappLink, ORDER_STATUS_LABELS } from '../lib/format.js';

export default function OrderSuccessPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { settings } = useStorefront();
  const reduce = useReducedMotion();

  const { data, loading, error } = useFetch(`/orders/${id}`, { skip: !isAuthenticated });
  useSeo({ title: 'Order confirmed', noIndex: true });

  // A fresh order means the bag changed; make sure nothing stale lingers.
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const order = data?.order;
  const tracker = data?.tracker || [];
  const waNumber = settings?.contact?.whatsapp;

  return (
    <div className="shell section">
      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-2xl text-center"
      >
        <motion.span
          initial={{ scale: reduce ? 1 : 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-[var(--primary)]"
        >
          <Check size={28} strokeWidth={1.6} className="text-[var(--text-inverse)]" aria-hidden="true" />
        </motion.span>

        <p className="eyebrow mb-3 text-[var(--accent)]">Thank you</p>
        <h1 className="display-xl mb-4">Your order is confirmed</h1>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          We’ve emailed your receipt. Each piece is checked by hand before it leaves
          the atelier, so give us a day or two to prepare your parcel.
        </p>
      </motion.div>

      {!isAuthenticated ? (
        <div className="mx-auto mt-10 max-w-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
          <Package size={26} strokeWidth={1.1} className="mx-auto mb-4 text-[var(--text-muted)]" aria-hidden="true" />
          <h2 className="display-sm mb-2">Track your order</h2>
          <p className="mb-6 text-sm text-[var(--text-muted)]">
            You checked out as a guest. Create an account with the same email to see
            this order and its delivery status any time.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn btn-primary">Create an account</Link>
            <Link to="/shop" className="btn btn-outline">Continue shopping</Link>
          </div>
        </div>
      ) : loading ? (
        <div className="mx-auto mt-12 max-w-3xl space-y-4">
          <LoadingSkeleton className="h-24 w-full" />
          <LoadingSkeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <div className="mx-auto mt-12 max-w-3xl">
          <ErrorState error={error} />
        </div>
      ) : order ? (
        <div className="mx-auto mt-12 max-w-3xl">
          {/* ---- meta */}
          <dl className="grid grid-cols-2 gap-4 border-y border-[var(--border)] py-5 sm:grid-cols-4">
            {[
              { label: 'Order number', value: order.orderNumber },
              { label: 'Placed on', value: formatDate(order.createdAt) },
              { label: 'Total', value: formatPrice(order.total) },
              { label: 'Status', value: ORDER_STATUS_LABELS[order.status] || order.status },
            ].map((row) => (
              <div key={row.label}>
                <dt className="eyebrow-sm mb-1 text-[var(--text-muted)]">{row.label}</dt>
                <dd className="text-sm">{row.value}</dd>
              </div>
            ))}
          </dl>

          {/* ---- tracker */}
          <section className="mt-10" aria-labelledby="track-heading">
            <h2 id="track-heading" className="display-sm mb-6">Delivery progress</h2>
            <OrderTracker tracker={tracker} status={order.status} />
          </section>

          {/* ---- items */}
          <section className="mt-10" aria-labelledby="items-heading">
            <h2 id="items-heading" className="display-sm mb-5">What’s coming</h2>
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {order.items.map((item) => (
                <li key={item._id} className="flex items-center gap-4 py-4">
                  <div className="w-14 shrink-0">
                    <SmartImage src={item.image} alt={item.name} ratio="3/4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">
                      {item.slug ? (
                        <Link to={`/product/${item.slug}`} className="link-underline">{item.name}</Link>
                      ) : item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {[item.size, item.color].filter(Boolean).join(' · ')}
                      {(item.size || item.color) ? ' · ' : ''}Qty {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm tabular-nums">{formatPrice(item.lineTotal ?? item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* ---- address */}
          <section className="mt-10 grid gap-6 sm:grid-cols-2" aria-label="Order details">
            <div>
              <h2 className="eyebrow-sm mb-2 text-[var(--text-muted)]">Shipping to</h2>
              <address className="text-sm not-italic leading-relaxed">
                {order.shippingAddress.fullName}<br />
                {[order.shippingAddress.house, order.shippingAddress.street, order.shippingAddress.area]
                  .filter(Boolean).join(', ')}<br />
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}<br />
                {order.shippingAddress.mobile}
              </address>
            </div>
            <div>
              <h2 className="eyebrow-sm mb-2 text-[var(--text-muted)]">Payment</h2>
              <p className="text-sm leading-relaxed">
                {order.paymentMethod === 'cod' ? 'Cash on delivery' : order.paymentMethod.toUpperCase()}<br />
                <span className="text-[var(--text-muted)]">
                  {order.paymentStatus === 'paid' ? 'Paid' : 'Payable on delivery'}
                </span>
              </p>
            </div>
          </section>

          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Link to={`/account/orders/${order._id}`} className="btn btn-primary">View order</Link>
            <Link to="/shop" className="btn btn-outline">Continue shopping</Link>
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
        </div>
      ) : null}
    </div>
  );
}
