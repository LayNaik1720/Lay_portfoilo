import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import { AccountSection } from './AccountLayout.jsx';
import {
  SmartImage, Badge, EmptyState, ErrorState, LoadingSkeleton,
} from '../../components/ui/Primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { formatPrice, formatDate, ORDER_STATUS_LABELS, statusTone } from '../../lib/format.js';

export default function AccountOrders() {
  const [page, setPage] = useState(1);
  const { data: orders, meta, loading, error, refetch } = useFetch(
    `/orders/mine?page=${page}&limit=10`,
    { deps: [page] },
  );

  useSeo({ title: 'Your orders', noIndex: true });

  return (
    <AccountSection title="Orders" description="Every order you’ve placed with us.">
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <LoadingSkeleton key={i} className="h-36 w-full" />)}
        </div>
      ) : orders?.length ? (
        <>
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order._id}>
                {/* A card, not a table row — this has to work at 360px. */}
                <Link
                  to={`/account/orders/${order._id}`}
                  className="group block border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--primary)] md:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
                    <div>
                      <p className="text-sm font-medium">{order.orderNumber}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        Placed {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <Badge tone={statusTone(order.status)}>
                      {ORDER_STATUS_LABELS[order.status] || order.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <ul className="flex -space-x-3">
                      {order.items.slice(0, 4).map((item) => (
                        <li key={item._id} className="w-12 border-2 border-[var(--surface)]">
                          <SmartImage src={item.image} alt="" ratio="3/4" />
                        </li>
                      ))}
                      {order.items.length > 4 && (
                        <li className="grid w-12 place-items-center border-2 border-[var(--surface)] bg-[var(--surface-muted)] text-xs text-[var(--text-muted)]">
                          +{order.items.length - 4}
                        </li>
                      )}
                    </ul>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {order.items[0]?.name}
                        {order.items.length > 1 && (
                          <span className="text-[var(--text-muted)]"> and {order.items.length - 1} more</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-sm font-medium tabular-nums">{formatPrice(order.total)}</p>
                    </div>

                    <ChevronRight
                      size={18}
                      className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {meta?.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button" className="btn btn-outline btn-sm"
                disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="text-xs text-[var(--text-muted)]">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                type="button" className="btn btn-outline btn-sm"
                disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="When you place an order it will appear here, with live delivery tracking."
          action={<Link to="/shop" className="btn btn-primary">Shop the collection</Link>}
        />
      )}
    </AccountSection>
  );
}
