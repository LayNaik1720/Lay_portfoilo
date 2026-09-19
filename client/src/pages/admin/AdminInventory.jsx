import { useState } from 'react';
import { Plus, Minus, History, Boxes } from 'lucide-react';
import {
  AdminPageHeader, AdminToolbar, AdminTable, AdminPagination, StatCard,
  AdminDrawer, FormField, SaveButton,
} from '../../components/admin/AdminUI.jsx';
import { SmartImage, Badge } from '../../components/ui/Primitives.jsx';
import { useFetch, useDebounced } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api, qs } from '../../lib/api.js';
import { formatDateTime } from '../../lib/format.js';

const STATUS_LABELS = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Sold out',
};

const STATUS_TONES = {
  in_stock: 'success',
  low_stock: 'muted',
  out_of_stock: 'error',
};

const REASONS = [
  { value: 'restock', label: 'Restock — new units received' },
  { value: 'manual_adjustment', label: 'Manual adjustment' },
  { value: 'correction', label: 'Correction — fixing a miscount' },
];

/** Adjust or set stock for one row, with a reason recorded in the log. */
function AdjustForm({ row, onDone }) {
  const [mode, setMode] = useState('adjust');
  const [adjustment, setAdjustment] = useState(1);
  const [stock, setStock] = useState(row.stock);
  const [reason, setReason] = useState('restock');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'adjust') {
        await api.post(`/admin/inventory/${row.productId}/adjust`, {
          variantId: row.variantId,
          adjustment: Number(adjustment),
          reason,
          note,
        });
      } else {
        await api.post(`/admin/inventory/${row.productId}/set`, {
          variantId: row.variantId,
          stock: Number(stock),
          note,
        });
      }
      toast.success('Stock updated.');
      onDone();
    } catch (err) {
      toast.error(err.message || 'Could not update stock.');
    } finally {
      setBusy(false);
    }
  };

  const projected = mode === 'adjust' ? row.stock + Number(adjustment || 0) : Number(stock || 0);

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-3 border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="w-12 shrink-0">
          <SmartImage src={row.image} alt="" ratio="3/4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.productName}</p>
          <p className="text-xs text-[var(--text-muted)]">{row.sku} · {row.variantLabel}</p>
          <p className="mt-0.5 text-xs">Currently <strong>{row.stock}</strong> in stock</p>
        </div>
      </div>

      <div role="radiogroup" aria-label="Update mode" className="flex gap-2">
        {[
          { value: 'adjust', label: 'Adjust by' },
          { value: 'set', label: 'Set exact count' },
        ].map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={mode === m.value}
            onClick={() => setMode(m.value)}
            className={`flex-1 border px-3 py-2.5 text-xs transition-colors ${
              mode === m.value
                ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--text-inverse)]'
                : 'border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--primary)]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'adjust' ? (
        <>
          <FormField label="Adjustment" htmlFor="adj" hint="Use a negative number to remove units.">
            <div className="flex items-center gap-2">
              <button
                type="button" className="icon-btn icon-btn-bordered"
                onClick={() => setAdjustment((a) => Number(a) - 1)} aria-label="Decrease"
              >
                <Minus size={15} />
              </button>
              <input
                id="adj" type="number" className="field text-center"
                value={adjustment} onChange={(e) => setAdjustment(e.target.value)}
              />
              <button
                type="button" className="icon-btn icon-btn-bordered"
                onClick={() => setAdjustment((a) => Number(a) + 1)} aria-label="Increase"
              >
                <Plus size={15} />
              </button>
            </div>
          </FormField>

          <FormField label="Reason" htmlFor="reason" hint="Recorded against this change in the stock log.">
            <select id="reason" className="field" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </FormField>
        </>
      ) : (
        <FormField label="New stock count" htmlFor="stock">
          <input
            id="stock" type="number" min="0" className="field"
            value={stock} onChange={(e) => setStock(e.target.value)}
          />
        </FormField>
      )}

      <FormField label="Note" htmlFor="note" hint="Optional — e.g. supplier invoice number.">
        <input id="note" className="field" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>

      <p className={`border px-4 py-3 text-sm ${
        projected < 0
          ? 'border-[var(--error)] bg-[#f9efec] text-[var(--error)]'
          : 'border-[var(--border)] bg-[var(--surface-muted)]'
      }`}>
        New stock level: <strong>{projected}</strong>
        {projected < 0 && ' — stock cannot go below zero.'}
      </p>

      <div className="border-t border-[var(--border)] pt-5">
        <SaveButton busy={busy} disabled={busy || projected < 0}>Update stock</SaveButton>
      </div>
    </form>
  );
}

/** Recent stock movements with reason and delta. */
function HistoryPanel() {
  const { data: logs, loading } = useFetch('/admin/inventory/history?limit=30');

  if (loading) return <p className="text-sm text-[var(--text-muted)]">Loading…</p>;
  if (!logs?.length) return <p className="text-sm text-[var(--text-muted)]">No stock movements recorded yet.</p>;

  return (
    <ul className="divide-y divide-[var(--border)]">
      {logs.map((log) => (
        <li key={log._id} className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {log.product?.name || log.sku || 'Deleted product'}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {String(log.reason || '').replace(/_/g, ' ')}
                {log.note ? ` · ${log.note}` : ''}
                {log.performedBy ? ` · ${log.performedBy}` : ''}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">{formatDateTime(log.createdAt)}</p>
            </div>
            <span className={`shrink-0 text-sm tabular-nums ${
              log.adjustment > 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
            }`}>
              {log.adjustment > 0 ? '+' : ''}{log.adjustment}
              <span className="ml-1.5 text-xs text-[var(--text-muted)]">→ {log.newStock}</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminInventory() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [adjusting, setAdjusting] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const debounced = useDebounced(search, 300);

  useSeo({ title: 'Inventory', noIndex: true });

  const path = `/admin/inventory${qs({ page, limit: 25, search: debounced, status })}`;
  const { data: rows, meta, loading, error, refetch } = useFetch(path, {
    deps: [page, debounced, status],
  });

  const summary = meta?.summary;

  const columns = [
    {
      key: 'product',
      header: 'Item',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-10 shrink-0">
            <SmartImage src={r.image} alt="" ratio="3/4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{r.productName}</p>
            <p className="text-xs text-[var(--text-muted)]">{r.variantLabel}</p>
          </div>
        </div>
      ),
    },
    { key: 'sku', header: 'SKU', hideOnMobile: true, render: (r) => <span className="text-xs">{r.sku}</span> },
    {
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (r) => <span className="text-sm text-[var(--text-muted)]">{r.category?.name || '—'}</span>,
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (r) => <span className="text-sm font-medium tabular-nums">{r.stock}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={STATUS_TONES[r.status]}>{STATUS_LABELS[r.status]}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (r) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setAdjusting(r); }}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          Adjust
        </button>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Inventory"
        description="Stock by variant, with every movement logged."
        action={(
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setHistoryOpen(true)}>
            <History size={14} /> Stock log
          </button>
        )}
      />

      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatCard label="Total SKUs" value={summary.all} Icon={Boxes} />
          <StatCard label="In stock" value={summary.in_stock} tone="success" />
          <StatCard label="Low stock" value={summary.low_stock} tone="warning" />
          <StatCard label="Sold out" value={summary.out_of_stock} tone="error" />
        </div>
      )}

      <AdminToolbar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search by product or SKU…">
        <label className="sr-only" htmlFor="stock-filter">Filter by stock status</label>
        <select
          id="stock-filter"
          className="field field-sm w-auto min-w-[9rem] cursor-pointer"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All stock levels</option>
          <option value="in_stock">In stock</option>
          <option value="low_stock">Low stock</option>
          <option value="out_of_stock">Sold out</option>
        </select>
      </AdminToolbar>

      <AdminTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        rowKey={(r) => `${r.productId}-${r.variantId || 'base'}`}
        onRowClick={setAdjusting}
        emptyTitle="Nothing matches"
        emptyDescription="Try a different search or stock filter."
      />

      <AdminPagination meta={meta} page={page} onPage={setPage} />

      <AdminDrawer
        open={!!adjusting}
        onClose={() => setAdjusting(null)}
        title="Adjust stock"
      >
        {adjusting && (
          <AdjustForm
            row={adjusting}
            onDone={() => { setAdjusting(null); refetch(); }}
          />
        )}
      </AdminDrawer>

      <AdminDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} title="Stock movements">
        <HistoryPanel />
      </AdminDrawer>
    </>
  );
}
