import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AdminPageHeader, AdminToolbar, AdminTable, AdminPagination,
} from '../../components/admin/AdminUI.jsx';
import { Badge } from '../../components/ui/Primitives.jsx';
import { useFetch, useDebounced } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { qs } from '../../lib/api.js';
import {
  formatPrice, formatDate, ORDER_STATUS_LABELS, statusTone,
} from '../../lib/format.js';

const STATUSES = [
  'pending', 'payment_processing', 'payment_confirmed', 'confirmed', 'packed',
  'shipped', 'delivered', 'cancelled', 'return_requested', 'returned',
  'refund_initiated', 'refunded',
];

export default function AdminOrders() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debounced = useDebounced(search, 300);
  const navigate = useNavigate();

  useSeo({ title: 'Orders', noIndex: true });

  const path = `/admin/orders${qs({ page, limit: 20, search: debounced, status })}`;
  const { data: orders, meta, loading, error } = useFetch(path, {
    deps: [page, debounced, status],
  });

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (o) => (
        <div className="min-w-0">
          <p className="text-sm font-medium">{o.orderNumber}</p>
          <p className="text-xs text-[var(--text-muted)]">{formatDate(o.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (o) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{o.customer.name}</p>
          <p className="truncate text-xs text-[var(--text-muted)]">{o.customer.email}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      hideOnMobile: true,
      render: (o) => (
        <span className="text-sm tabular-nums">
          {o.items.reduce((sum, i) => sum + i.quantity, 0)}
        </span>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      hideOnMobile: true,
      render: (o) => (
        <div>
          <p className="text-xs uppercase">{o.paymentMethod}</p>
          <p className={`text-xs ${o.paymentStatus === 'paid' ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
            {o.paymentStatus}
          </p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (o) => <span className="text-sm font-medium tabular-nums">{formatPrice(o.total)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => (
        <Badge tone={statusTone(o.status)}>{ORDER_STATUS_LABELS[o.status] || o.status}</Badge>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Orders"
        description="Every order, with full fulfilment control."
      />

      <AdminToolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        placeholder="Search by order number, name or email…"
      >
        <label className="sr-only" htmlFor="order-status">Filter by status</label>
        <select
          id="order-status"
          className="field field-sm w-auto min-w-[11rem] cursor-pointer"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s] || s}</option>
          ))}
        </select>
      </AdminToolbar>

      <AdminTable
        columns={columns}
        rows={orders}
        loading={loading}
        error={error}
        onRowClick={(o) => navigate(`/admin/orders/${o._id}`)}
        emptyTitle={debounced || status ? 'No matching orders' : 'No orders yet'}
        emptyDescription={
          debounced || status
            ? 'Try a different search term or status filter.'
            : 'Orders placed in the storefront will appear here.'
        }
      />

      <AdminPagination meta={meta} page={page} onPage={setPage} />
    </>
  );
}
