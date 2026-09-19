import { useState } from 'react';
import {
  AdminPageHeader, AdminToolbar, AdminTable, AdminPagination, AdminDrawer, Toggle,
} from '../../components/admin/AdminUI.jsx';
import { Badge, LoadingSkeleton } from '../../components/ui/Primitives.jsx';
import { useFetch, useDebounced } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api, qs } from '../../lib/api.js';
import {
  formatPrice, formatDate, ORDER_STATUS_LABELS, statusTone,
} from '../../lib/format.js';

/** Customer profile + their order history. */
function CustomerPanel({ customerId, onChanged }) {
  const { data, loading, refetch } = useFetch(`/admin/customers/${customerId}`);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="space-y-3">
        <LoadingSkeleton className="h-20 w-full" />
        <LoadingSkeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!data) return null;

  const customer = data.customer || data.user || data;
  const orders = data.orders || [];

  const toggleActive = async (isActive) => {
    setBusy(true);
    try {
      await api.patch(`/admin/customers/${customerId}/status`, { isActive });
      toast.success(isActive ? 'Account enabled.' : 'Account disabled.');
      refetch();
      onChanged?.();
    } catch (err) {
      toast.error(err.message || 'Could not update that account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 className="display-sm">{customer.name}</h3>
        <p className="mt-1 text-sm">
          <a href={`mailto:${customer.email}`} className="link-underline">{customer.email}</a>
        </p>
        {customer.mobile && <p className="mt-0.5 text-sm text-[var(--text-muted)]">{customer.mobile}</p>}
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Joined {formatDate(customer.createdAt)}
        </p>
      </section>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Orders', value: data.stats?.orderCount ?? customer.orderCount ?? orders.length },
          { label: 'Spent', value: formatPrice(data.stats?.totalSpent ?? customer.totalSpent ?? 0) },
          { label: 'Addresses', value: customer.addresses?.length ?? 0 },
        ].map((s) => (
          <div key={s.label} className="border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
            <p className="font-[var(--font-display)] text-xl font-light">{s.value}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 className="eyebrow-sm mb-3 text-[var(--text-muted)]">Account access</h3>
        <Toggle
          id="cust-active"
          checked={customer.isActive !== false}
          onChange={toggleActive}
          label={customer.isActive !== false ? 'Account active' : 'Account disabled'}
          hint="Disabled customers cannot sign in or place orders."
        />
        {busy && <p className="mt-2 text-xs text-[var(--text-muted)]">Updating…</p>}
      </section>

      {customer.addresses?.length > 0 && (
        <section>
          <h3 className="eyebrow-sm mb-3 text-[var(--text-muted)]">Saved addresses</h3>
          <ul className="space-y-2">
            {customer.addresses.map((a) => (
              <li key={a._id} className="border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
                <p className="font-medium">{a.fullName} {a.isDefault && <Badge tone="success">Default</Badge>}</p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {[a.house, a.street, a.area, a.city, a.state, a.pincode].filter(Boolean).join(', ')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="eyebrow-sm mb-3 text-[var(--text-muted)]">Order history</h3>
        {orders.length ? (
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {orders.map((order) => (
              <li key={order._id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{order.orderNumber}</p>
                  <p className="text-xs text-[var(--text-muted)]">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={statusTone(order.status)}>
                    {ORDER_STATUS_LABELS[order.status] || order.status}
                  </Badge>
                  <span className="text-sm tabular-nums">{formatPrice(order.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No orders yet.</p>
        )}
      </section>
    </div>
  );
}

export default function AdminCustomers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const debounced = useDebounced(search, 300);

  useSeo({ title: 'Customers', noIndex: true });

  const path = `/admin/customers${qs({ page, limit: 20, search: debounced })}`;
  const { data: customers, meta, loading, error, refetch } = useFetch(path, {
    deps: [page, debounced],
  });

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      render: (c) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{c.name}</p>
          <p className="truncate text-xs text-[var(--text-muted)]">{c.email}</p>
        </div>
      ),
    },
    {
      key: 'mobile',
      header: 'Mobile',
      hideOnMobile: true,
      render: (c) => <span className="text-sm text-[var(--text-muted)]">{c.mobile || '—'}</span>,
    },
    {
      key: 'orderCount',
      header: 'Orders',
      render: (c) => <span className="text-sm tabular-nums">{c.orderCount ?? 0}</span>,
    },
    {
      key: 'totalSpent',
      header: 'Spent',
      render: (c) => <span className="text-sm tabular-nums">{formatPrice(c.totalSpent ?? 0)}</span>,
    },
    {
      key: 'lastOrderAt',
      header: 'Last order',
      hideOnMobile: true,
      render: (c) => (
        <span className="text-sm text-[var(--text-muted)]">
          {c.lastOrderAt ? formatDate(c.lastOrderAt) : '—'}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (c) => (
        <Badge tone={c.isActive === false ? 'error' : 'success'}>
          {c.isActive === false ? 'Disabled' : 'Active'}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Customers"
        description="Everyone who has registered an account, with real order totals."
      />

      <AdminToolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        placeholder="Search by name, email or phone…"
      />

      <AdminTable
        columns={columns}
        rows={customers}
        loading={loading}
        error={error}
        onRowClick={setSelected}
        emptyTitle={debounced ? 'No matching customers' : 'No customers yet'}
        emptyDescription={
          debounced
            ? 'Try a different name or email.'
            : 'Registered shoppers will appear here with their order history.'
        }
      />

      <AdminPagination meta={meta} page={page} onPage={setPage} />

      <AdminDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Customer"
      >
        {selected && <CustomerPanel customerId={selected._id} onChanged={refetch} />}
      </AdminDrawer>
    </>
  );
}
