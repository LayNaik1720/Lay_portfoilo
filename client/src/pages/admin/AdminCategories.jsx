import { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import {
  AdminPageHeader, AdminTable, AdminDrawer, FormField, Toggle, SaveButton, ConfirmDelete,
} from '../../components/admin/AdminUI.jsx';
import { SmartImage, Badge } from '../../components/ui/Primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';

const IMAGE_LIBRARY = [
  '/images/collections/sarees.jpg',
  '/images/collections/lehengas.jpg',
  '/images/collections/kurtis.jpg',
  '/images/collections/indo-western.jpg',
  '/images/collections/dresses.jpg',
  '/images/collections/navratri.jpg',
];

const EMPTY = {
  name: '', slug: '', subtitle: '', description: '', image: '',
  featureSize: 'regular', displayOrder: 0, isVisible: true,
};

const SIZES = [
  { value: 'large', label: 'Large — dominates the grid' },
  { value: 'tall', label: 'Tall — full-height column' },
  { value: 'wide', label: 'Wide — spans two columns' },
  { value: 'regular', label: 'Regular' },
];

function CategoryForm({ initial, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  const onInput = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      setErrors({ name: 'Category name is required.' });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await onSave({ ...form, displayOrder: Number(form.displayOrder) || 0 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} id="category-form" noValidate className="space-y-5">
      <FormField label="Name" htmlFor="c-name" error={errors.name}>
        <input
          id="c-name" className="field" value={form.name} onChange={onInput('name')} required
          aria-invalid={errors.name ? 'true' : undefined}
        />
      </FormField>

      <FormField label="Slug" htmlFor="c-slug" hint="Used in the URL: /category/your-slug. Leave blank to generate.">
        <input id="c-slug" className="field" value={form.slug} onChange={onInput('slug')} />
      </FormField>

      <FormField label="Subtitle" htmlFor="c-subtitle" hint="Shown under the name on the homepage grid.">
        <input id="c-subtitle" className="field" value={form.subtitle} onChange={onInput('subtitle')} />
      </FormField>

      <FormField label="Description" htmlFor="c-desc">
        <textarea id="c-desc" className="field" rows={3} value={form.description} onChange={onInput('description')} />
      </FormField>

      <FormField label="Image" hint="Choose the photograph used on the collection grid.">
        <div className="grid grid-cols-3 gap-2.5">
          {IMAGE_LIBRARY.map((url) => (
            <button
              key={url} type="button"
              onClick={() => setForm({ ...form, image: url })}
              aria-pressed={form.image === url}
              className={`overflow-hidden border-2 transition-colors ${
                form.image === url ? 'border-[var(--primary)]' : 'border-transparent hover:border-[var(--border-strong)]'
              }`}
            >
              <SmartImage src={url} alt="" ratio="4/3" />
            </button>
          ))}
        </div>
        <input
          className="field field-sm mt-2.5" value={form.image} onChange={onInput('image')}
          placeholder="/images/collections/…" aria-label="Image path"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Grid size" htmlFor="c-size" hint="Drives the asymmetric homepage layout.">
          <select id="c-size" className="field" value={form.featureSize} onChange={onInput('featureSize')}>
            {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </FormField>

        <FormField label="Display order" htmlFor="c-order" hint="Lower numbers appear first.">
          <input id="c-order" type="number" className="field" value={form.displayOrder} onChange={onInput('displayOrder')} />
        </FormField>
      </div>

      <Toggle
        id="c-visible"
        checked={form.isVisible}
        onChange={(v) => setForm({ ...form, isVisible: v })}
        label="Visible in the shop"
        hint="Hidden categories stay in the admin but disappear from the storefront."
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

export default function AdminCategories() {
  const { data: categories, loading, error, refetch } = useFetch('/admin/categories');
  const [editing, setEditing] = useState(null);
  const toast = useToast();

  useSeo({ title: 'Categories', noIndex: true });

  const save = async (form) => {
    try {
      if (form._id) await api.put(`/admin/categories/${form._id}`, form);
      else await api.post('/admin/categories', form);
      toast.success('Category saved.');
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not save that category.');
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success('Category deleted.');
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not delete that category.');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Category',
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-12 shrink-0">
            <SmartImage src={c.image} alt="" ratio="4/3" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{c.name}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">/{c.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'subtitle',
      header: 'Subtitle',
      hideOnMobile: true,
      render: (c) => <span className="text-sm text-[var(--text-muted)]">{c.subtitle || '—'}</span>,
    },
    {
      key: 'featureSize',
      header: 'Grid size',
      render: (c) => <span className="text-sm capitalize">{c.featureSize}</span>,
    },
    {
      key: 'displayOrder',
      header: 'Order',
      render: (c) => <span className="text-sm tabular-nums">{c.displayOrder}</span>,
    },
    {
      key: 'isVisible',
      header: 'Visibility',
      render: (c) => (
        <Badge tone={c.isVisible ? 'success' : 'muted'}>{c.isVisible ? 'Visible' : 'Hidden'}</Badge>
      ),
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
        title="Categories"
        description="Shape the Shop By Collection grid on the homepage."
        action={(
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({})}>
            <Plus size={14} /> New category
          </button>
        )}
      />

      <AdminTable
        columns={columns}
        rows={categories}
        loading={loading}
        error={error}
        onRowClick={setEditing}
        emptyTitle="No categories yet"
        emptyDescription="Categories organise the catalogue and drive the homepage grid."
        emptyAction={(
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({})}>
            <Plus size={14} /> New category
          </button>
        )}
      />

      <AdminDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit category' : 'New category'}
      >
        {editing && (
          <CategoryForm
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
