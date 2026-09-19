import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil } from 'lucide-react';
import {
  AdminPageHeader, AdminToolbar, AdminTable, AdminPagination, ConfirmDelete,
} from '../../components/admin/AdminUI.jsx';
import { SmartImage, Badge } from '../../components/ui/Primitives.jsx';
import { useFetch, useDebounced } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api, qs } from '../../lib/api.js';
import { formatPrice } from '../../lib/format.js';

const STATUS_TONES = { active: 'success', draft: 'muted', archived: 'error' };

export default function AdminProducts() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debounced = useDebounced(search, 300);
  const toast = useToast();
  const navigate = useNavigate();

  useSeo({ title: 'Products', noIndex: true });

  const path = `/admin/products${qs({ page, limit: 20, search: debounced, status })}`;
  const { data: products, meta, loading, error, refetch } = useFetch(path, {
    deps: [page, debounced, status],
  });

  const remove = async (product) => {
    try {
      await api.delete(`/admin/products/${product._id}`);
      toast.success(`${product.name} deleted.`);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not delete that product.');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Product',
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-10 shrink-0">
            <SmartImage src={p.images?.[0]?.url} alt="" ratio="3/4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{p.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{p.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (p) => <span className="text-sm text-[var(--text-muted)]">{p.category?.name || '—'}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      render: (p) => (
        <span className="text-sm tabular-nums">
          {formatPrice(p.price)}
          {p.originalPrice > p.price && (
            <span className="ml-1.5 text-xs text-[var(--text-muted)] line-through">
              {formatPrice(p.originalPrice)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (p) => (
        <span className={`text-sm tabular-nums ${
          p.stock <= 0 ? 'text-[var(--error)]' : p.stock <= (p.lowStockThreshold || 3) ? 'text-[var(--warning)]' : ''
        }`}>
          {p.stock}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <div className="flex flex-wrap justify-end gap-1 md:justify-start">
          <Badge tone={STATUS_TONES[p.status] || 'muted'}>{p.status}</Badge>
          {p.isFeatured && <Badge tone="gold">Featured</Badge>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (p) => (
        <div className="flex items-center justify-end gap-3">
          <Link
            to={`/admin/products/${p._id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            <Pencil size={12} aria-hidden="true" /> Edit
          </Link>
          <span onClick={(e) => e.stopPropagation()}>
            <ConfirmDelete onConfirm={() => remove(p)} />
          </span>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Your catalogue — pricing, imagery, variants and visibility."
        action={(
          <Link to="/admin/products/new" className="btn btn-primary btn-sm">
            <Plus size={14} /> New product
          </Link>
        )}
      />

      <AdminToolbar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name or SKU…">
        <label className="sr-only" htmlFor="status-filter">Filter by status</label>
        <select
          id="status-filter"
          className="field field-sm w-auto min-w-[9rem] cursor-pointer"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </AdminToolbar>

      <AdminTable
        columns={columns}
        rows={products}
        loading={loading}
        error={error}
        onRowClick={(p) => navigate(`/admin/products/${p._id}`)}
        emptyTitle={debounced ? 'No matching products' : 'No products yet'}
        emptyDescription={debounced ? 'Try a different name or SKU.' : 'Add your first piece to get the catalogue started.'}
        emptyAction={!debounced && (
          <Link to="/admin/products/new" className="btn btn-primary btn-sm">
            <Plus size={14} /> New product
          </Link>
        )}
      />

      <AdminPagination meta={meta} page={page} onPage={setPage} />
    </>
  );
}
