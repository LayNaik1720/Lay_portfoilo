import { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import {
  AdminPageHeader, AdminTable, AdminDrawer, FormField, Toggle, SaveButton, ConfirmDelete,
} from '../../components/admin/AdminUI.jsx';
import { Badge } from '../../components/ui/Primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatPrice, formatDate } from '../../lib/format.js';

const EMPTY = {
  code: '', description: '', discountType: 'percentage', discountValue: 10,
  minOrderValue: 0, maxDiscount: '', expiryDate: '', usageLimit: '',
  perCustomerLimit: '', eligibility: 'all', isActive: true,
};

const ELIGIBILITY = [
  { value: 'all', label: 'Everyone' },
  { value: 'new_customers', label: 'New customers only' },
  { value: 'existing_customers', label: 'Returning customers only' },
];

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

function CouponForm({ initial, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState({
    ...EMPTY,
    ...initial,
    maxDiscount: initial?.maxDiscount ?? '',
    usageLimit: initial?.usageLimit ?? '',
    perCustomerLimit: initial?.perCustomerLimit ?? '',
    expiryDate: toDateInput(initial?.expiryDate),
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const onInput = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.code.trim().length < 2) next.code = 'A coupon code is required.';
    if (form.discountValue === '' || Number(form.discountValue) <= 0) next.discountValue = 'Enter a discount above zero.';
    if (form.discountType === 'percentage' && Number(form.discountValue) > 100) {
      next.discountValue = 'A percentage cannot exceed 100.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await onSave({
        ...form,
        code: form.code.trim().toUpperCase(),
        discountValue: Number(form.discountValue),
        minOrderValue: Number(form.minOrderValue) || 0,
        maxDiscount: form.maxDiscount === '' ? null : Number(form.maxDiscount),
        usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
        perCustomerLimit: form.perCustomerLimit === '' ? null : Number(form.perCustomerLimit),
        expiryDate: form.expiryDate || null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FormField label="Code" htmlFor="co-code" error={errors.code} hint="Shoppers type this at checkout. Stored uppercase.">
        <input
          id="co-code" className="field uppercase" value={form.code} onChange={onInput('code')} required
          aria-invalid={errors.code ? 'true' : undefined} placeholder="WELCOME10"
        />
      </FormField>

      <FormField label="Description" htmlFor="co-desc" hint="Internal reference and popup copy.">
        <input id="co-desc" className="field" maxLength={200} value={form.description} onChange={onInput('description')} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Discount type" htmlFor="co-type">
          <select id="co-type" className="field" value={form.discountType} onChange={onInput('discountType')}>
            <option value="percentage">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
          </select>
        </FormField>

        <FormField
          label={form.discountType === 'percentage' ? 'Percentage (%)' : 'Amount (₹)'}
          htmlFor="co-value" error={errors.discountValue}
        >
          <input
            id="co-value" type="number" min="0" className="field"
            value={form.discountValue} onChange={onInput('discountValue')} required
            aria-invalid={errors.discountValue ? 'true' : undefined}
          />
        </FormField>

        <FormField label="Minimum order (₹)" htmlFor="co-min" hint="0 for no minimum.">
          <input id="co-min" type="number" min="0" className="field" value={form.minOrderValue} onChange={onInput('minOrderValue')} />
        </FormField>

        <FormField label="Maximum discount (₹)" htmlFor="co-max" hint="Caps percentage coupons. Blank for no cap.">
          <input id="co-max" type="number" min="0" className="field" value={form.maxDiscount} onChange={onInput('maxDiscount')} />
        </FormField>

        <FormField label="Expiry date" htmlFor="co-expiry" hint="Blank means it never expires.">
          <input id="co-expiry" type="date" className="field" value={form.expiryDate} onChange={onInput('expiryDate')} />
        </FormField>

        <FormField label="Who can use it" htmlFor="co-eligibility">
          <select id="co-eligibility" className="field" value={form.eligibility} onChange={onInput('eligibility')}>
            {ELIGIBILITY.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>

        <FormField label="Total uses" htmlFor="co-limit" hint="Blank for unlimited.">
          <input id="co-limit" type="number" min="0" className="field" value={form.usageLimit} onChange={onInput('usageLimit')} />
        </FormField>

        <FormField label="Uses per customer" htmlFor="co-per" hint="Blank for unlimited.">
          <input id="co-per" type="number" min="0" className="field" value={form.perCustomerLimit} onChange={onInput('perCustomerLimit')} />
        </FormField>
      </div>

      <Toggle
        id="co-active"
        checked={form.isActive}
        onChange={(v) => setForm({ ...form, isActive: v })}
        label="Active"
        hint="Inactive codes are rejected at checkout."
      />

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="btn btn-outline btn-sm">Cancel</button>
          <SaveButton busy={busy} />
        </div>
        {initial?._id && <ConfirmDelete onConfirm={onDelete} label="Delete" />}
      </div>
    </form>
  );
}

export default function AdminCoupons() {
  const { data: coupons, loading, error, refetch } = useFetch('/admin/coupons');
  const [editing, setEditing] = useState(null);
  const toast = useToast();

  useSeo({ title: 'Coupons', noIndex: true });

  const save = async (form) => {
    try {
      if (form._id) await api.put(`/admin/coupons/${form._id}`, form);
      else await api.post('/admin/coupons', form);
      toast.success('Coupon saved.');
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not save that coupon.');
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/coupons/${id}`);
      toast.success('Coupon deleted.');
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not delete that coupon.');
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'Code',
      render: (c) => (
        <div className="min-w-0">
          <p className="text-sm font-medium">{c.code}</p>
          <p className="truncate text-xs text-[var(--text-muted)]">{c.description || '—'}</p>
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (c) => (
        <span className="text-sm">
          {c.discountType === 'percentage' ? `${c.discountValue}%` : formatPrice(c.discountValue)}
          {c.maxDiscount ? <span className="text-xs text-[var(--text-muted)]"> max {formatPrice(c.maxDiscount)}</span> : null}
        </span>
      ),
    },
    {
      key: 'minOrderValue',
      header: 'Min order',
      hideOnMobile: true,
      render: (c) => (
        <span className="text-sm text-[var(--text-muted)]">
          {c.minOrderValue > 0 ? formatPrice(c.minOrderValue) : '—'}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Used',
      render: (c) => (
        <span className="text-sm tabular-nums">
          {c.usageCount ?? 0}{c.usageLimit ? ` / ${c.usageLimit}` : ''}
        </span>
      ),
    },
    {
      key: 'expiryDate',
      header: 'Expires',
      hideOnMobile: true,
      render: (c) => (
        <span className="text-sm text-[var(--text-muted)]">
          {c.expiryDate ? formatDate(c.expiryDate) : 'Never'}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (c) => {
        const expired = c.expiryDate && new Date(c.expiryDate) < new Date();
        return (
          <Badge tone={expired ? 'error' : c.isActive ? 'success' : 'muted'}>
            {expired ? 'Expired' : c.isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (c) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setEditing(c); }}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <Pencil size={12} aria-hidden="true" /> Edit
        </button>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Coupons"
        description="Discount codes, their rules and how often they’ve been used."
        action={(
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({})}>
            <Plus size={14} /> New coupon
          </button>
        )}
      />

      <AdminTable
        columns={columns}
        rows={coupons}
        loading={loading}
        error={error}
        onRowClick={setEditing}
        emptyTitle="No coupons yet"
        emptyDescription="Create a code to run a promotion — the welcome popup uses one too."
        emptyAction={(
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({})}>
            <Plus size={14} /> New coupon
          </button>
        )}
      />

      <AdminDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? `Edit ${editing.code}` : 'New coupon'}
      >
        {editing && (
          <CouponForm
            initial={editing}
            onSave={save}
            onCancel={() => setEditing(null)}
            onDelete={() => remove(editing._id)}
          />
        )}
      </AdminDrawer>
    </>
  );
}
