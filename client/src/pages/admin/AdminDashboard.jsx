import { Link } from 'react-router-dom';
import {
  IndianRupee, ShoppingBag, Users, Package, AlertTriangle, ArrowRight, TrendingUp,
} from 'lucide-react';
import { AdminPageHeader, StatCard } from '../../components/admin/AdminUI.jsx';
import { Badge, LoadingSkeleton, ErrorState } from '../../components/ui/Primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { formatPrice, formatDate, ORDER_STATUS_LABELS, statusTone } from '../../lib/format.js';

/** Lightweight inline bar chart — no charting dependency needed. */
function SalesChart({ series = [] }) {
  if (!series.length) {
    return (
      <p className="py-10 text-center text-sm text-[var(--text-muted)]">
        No sales in the last 30 days yet.
      </p>
    );
  }

  const max = Math.max(...series.map((d) => d.sales), 1);

  return (
    <div>
      <div className="flex h-44 items-end gap-[3px]" role="img" aria-label="Daily sales over the last 30 days">
        {series.map((d) => {
          const height = Math.max(2, (d.sales / max) * 100);
          return (
            <div key={d.date} className="group relative flex-1">
              <div
                className="w-full bg-[var(--primary)] transition-colors group-hover:bg-[var(--accent)]"
                style={{ height: `${height}%` }}
              />
              {/* Tooltip on hover — desktop nicety, harmless on touch. */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap bg-[var(--primary-dark)] px-2.5 py-1.5 text-[0.6875rem] text-white group-hover:block">
                {formatDate(d.date)} · {formatPrice(d.sales)}
                <span className="block text-white/60">{d.orders} order{d.orders === 1 ? '' : 's'}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[0.6875rem] text-[var(--text-muted)]">
        <span>{formatDate(series[0].date)}</span>
        <span>{formatDate(series[series.length - 1].date)}</span>
      </div>
    </div>
  );
}

/** Horizontal ranking bars for best sellers. */
function BestSellerList({ items = [] }) {
  if (!items.length) {
    return <p className="py-8 text-center text-sm text-[var(--text-muted)]">No sales recorded yet.</p>;
  }
  const max = Math.max(...items.map((i) => i.units), 1);

  return (
    <ol className="space-y-3.5">
      {items.map((item, i) => (
        <li key={item.productId || i}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="mr-2 text-[var(--text-muted)]">{i + 1}</span>
              {item.name}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
              {item.units} sold · {formatPrice(item.revenue)}
            </span>
          </div>
          <div className="h-1 w-full bg-[var(--border)]">
            <div className="h-full bg-[var(--accent)]" style={{ width: `${(item.units / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function AdminDashboard() {
  const { data, loading, error, refetch } = useFetch('/admin/dashboard');
  useSeo({ title: 'Admin dashboard', noIndex: true });

  if (loading) {
    return (
      <div>
        <LoadingSkeleton className="mb-8 h-10 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <LoadingSkeleton key={i} className="h-28 w-full" />)}
        </div>
        <LoadingSkeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data) return null;

  const { sales, orders, customers, products, recentOrders, bestSellers, dailySeries } = data;

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="Live figures from real orders — nothing here is simulated."
      />

      {/* ---- KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue" Icon={IndianRupee}
          value={formatPrice(sales.total)}
          hint={`${formatPrice(sales.month)} this month`}
        />
        <StatCard
          label="Orders" Icon={ShoppingBag}
          value={orders.total}
          hint={`${orders.today} today · ${orders.pending} in progress`}
        />
        <StatCard
          label="Customers" Icon={Users}
          value={customers}
          hint="Registered accounts"
        />
        <StatCard
          label="Products" Icon={Package}
          value={products.total}
          hint={`${products.active} active · ${products.outOfStock} sold out`}
          tone={products.outOfStock > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* ---- stock alert */}
      {(products.outOfStock > 0 || products.lowStock > 0) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-[var(--warning)] bg-[#fdf6e9] px-4 py-3">
          <p className="flex items-center gap-2.5 text-sm">
            <AlertTriangle size={16} className="shrink-0 text-[var(--warning)]" aria-hidden="true" />
            <span>
              {products.outOfStock > 0 && <>{products.outOfStock} product{products.outOfStock === 1 ? '' : 's'} sold out</>}
              {products.outOfStock > 0 && products.lowStock > 0 && ' · '}
              {products.lowStock > 0 && <>{products.lowStock} running low</>}
            </span>
          </p>
          <Link to="/admin/inventory" className="text-sm link-underline">Manage inventory</Link>
        </div>
      )}

      {/* ---- charts */}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="chart-heading">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h2 id="chart-heading" className="display-sm">Sales, last 30 days</h2>
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <TrendingUp size={13} aria-hidden="true" /> {formatPrice(sales.today)} today
            </span>
          </div>
          <SalesChart series={dailySeries} />
        </section>

        <section className="border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="best-heading">
          <h2 id="best-heading" className="display-sm mb-5">Best sellers</h2>
          <BestSellerList items={bestSellers} />
        </section>
      </div>

      {/* ---- status breakdown + recent orders */}
      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1.6fr]">
        <section className="border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="status-heading">
          <h2 id="status-heading" className="display-sm mb-5">Orders by status</h2>
          <ul className="space-y-2.5">
            {Object.entries(orders.byStatus).map(([status, count]) => (
              <li key={status} className="flex items-center justify-between gap-3">
                <Badge tone={statusTone(status)}>{ORDER_STATUS_LABELS[status] || status}</Badge>
                <span className="text-sm tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="recent-heading">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h2 id="recent-heading" className="display-sm">Recent orders</h2>
            <Link to="/admin/orders" className="inline-flex items-center gap-1.5 text-sm link-underline">
              All orders <ArrowRight size={13} />
            </Link>
          </div>

          <ul className="divide-y divide-[var(--border)]">
            {recentOrders.map((order) => (
              <li key={order._id}>
                <Link
                  to={`/admin/orders/${order._id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{order.orderNumber}</p>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                      {order.customer.name} · {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge tone={statusTone(order.status)}>
                      {ORDER_STATUS_LABELS[order.status] || order.status}
                    </Badge>
                    <span className="text-sm tabular-nums">{formatPrice(order.total)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
