import { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import {
  AdminPageHeader, AdminTable, AdminDrawer, FormField, Toggle, SaveButton, ConfirmDelete,
} from '../../components/admin/AdminUI.jsx';
import { SmartImage, Badge, Rating } from '../../components/ui/Primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';

const IMAGE_LIBRARY = [
  '/images/editorial/story.jpg',
  '/images/editorial/about.jpg',
  '/images/products/saree-ruhi-1.jpg',
  '/images/products/lehenga-noor-1.jpg',
  '/images/products/kurti-dhara-1.jpg',
  '/images/products/indowestern-zoya-1.jpg',
  '/images/products/dress-aria-1.jpg',
  '/images/stories/lookbook.jpg',
  '/images/stories/behind-the-scenes.jpg',
  '/images/editorial/boutique.jpg',
  '/images/editorial/hero-desktop.jpg',
  '/images/editorial/hero-mobile.jpg',
  '/images/collections/sarees.jpg',
  '/images/collections/lehengas.jpg',
  '/images/collections/kurtis.jpg',
  '/images/collections/navratri.jpg',
];

/**
 * One page drives four content types. Each entry declares its endpoint,
 * default record, table columns and form fields, so the CRUD plumbing is
 * written once rather than four times.
 */
const TYPES = {
  testimonials: {
    title: 'Testimonials',
    description: 'Customer quotes shown on the homepage and about page.',
    endpoint: '/admin/testimonials',
    singular: 'testimonial',
    empty: { name: '', location: '', rating: 5, quote: '', image: '', displayOrder: 0, isPublished: true },
    activeKey: 'isPublished',
    columns: [
      { key: 'name', header: 'Name', render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{r.name}</p>
          <p className="truncate text-xs text-[var(--text-muted)]">{r.location || '—'}</p>
        </div>
      ) },
      { key: 'rating', header: 'Rating', render: (r) => <Rating value={r.rating} size={12} /> },
      { key: 'quote', header: 'Quote', hideOnMobile: true, render: (r) => (
        <p className="line-clamp-2 max-w-md text-xs text-[var(--text-muted)]">{r.quote}</p>
      ) },
    ],
    fields: (form, set) => (
      <>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="t-name">
            <input id="t-name" className="field" value={form.name} onChange={set('name')} required />
          </FormField>
          <FormField label="Location" htmlFor="t-location">
            <input id="t-location" className="field" value={form.location} onChange={set('location')} placeholder="Surat, Gujarat" />
          </FormField>
        </div>
        <FormField label="Rating" htmlFor="t-rating">
          <select id="t-rating" className="field" value={form.rating} onChange={set('rating')}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
          </select>
        </FormField>
        <FormField label="Quote" htmlFor="t-quote">
          <textarea id="t-quote" className="field" rows={4} maxLength={1000} value={form.quote} onChange={set('quote')} required />
        </FormField>
      </>
    ),
  },

  stories: {
    title: 'Stories & reels',
    description: 'Editorial films, lookbooks and journal entries.',
    endpoint: '/admin/stories',
    singular: 'story',
    empty: { title: '', description: '', image: '', videoUrl: '', link: '', kind: 'reel', displayOrder: 0, isActive: true },
    activeKey: 'isActive',
    columns: [
      { key: 'title', header: 'Story', render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-10 shrink-0"><SmartImage src={r.image} alt="" ratio="3/4" /></div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{r.title}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">{r.description || '—'}</p>
          </div>
        </div>
      ) },
      { key: 'kind', header: 'Type', render: (r) => (
        <span className="text-xs capitalize">{String(r.kind || '').replace(/_/g, ' ')}</span>
      ) },
    ],
    fields: (form, set) => (
      <>
        <FormField label="Title" htmlFor="s-title">
          <input id="s-title" className="field" value={form.title} onChange={set('title')} required />
        </FormField>
        <FormField label="Description" htmlFor="s-desc">
          <textarea id="s-desc" className="field" rows={3} maxLength={1000} value={form.description} onChange={set('description')} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Type" htmlFor="s-kind">
            <select id="s-kind" className="field" value={form.kind} onChange={set('kind')}>
              <option value="reel">Reel</option>
              <option value="lookbook">Lookbook</option>
              <option value="event">Event</option>
              <option value="behind_the_scenes">Behind the scenes</option>
              <option value="styling">Styling</option>
            </select>
          </FormField>
          <FormField label="Video URL" htmlFor="s-video" hint="Shows a play badge when set.">
            <input id="s-video" className="field" value={form.videoUrl} onChange={set('videoUrl')} />
          </FormField>
        </div>
        <FormField label="Link" htmlFor="s-link" hint="Where the card opens. Blank makes it non-clickable.">
          <input id="s-link" className="field" value={form.link} onChange={set('link')} />
        </FormField>
      </>
    ),
  },

  banners: {
    title: 'Banners',
    description: 'Promotional slots across the storefront.',
    endpoint: '/admin/banners',
    singular: 'banner',
    empty: {
      title: '', subtitle: '', eyebrow: '', image: '', mobileImage: '',
      primaryLabel: '', primaryLink: '', secondaryLabel: '', secondaryLink: '',
      placement: 'hero', displayOrder: 0, isActive: true,
    },
    activeKey: 'isActive',
    columns: [
      { key: 'title', header: 'Banner', render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-14 shrink-0"><SmartImage src={r.image} alt="" ratio="16/9" /></div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{r.title}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">{r.subtitle || '—'}</p>
          </div>
        </div>
      ) },
      { key: 'placement', header: 'Placement', render: (r) => <span className="text-xs capitalize">{r.placement}</span> },
    ],
    fields: (form, set) => (
      <>
        <FormField label="Eyebrow" htmlFor="b-eyebrow" hint="Small label above the heading.">
          <input id="b-eyebrow" className="field" value={form.eyebrow} onChange={set('eyebrow')} />
        </FormField>
        <FormField label="Title" htmlFor="b-title">
          <input id="b-title" className="field" value={form.title} onChange={set('title')} required />
        </FormField>
        <FormField label="Subtitle" htmlFor="b-subtitle">
          <textarea id="b-subtitle" className="field" rows={2} maxLength={300} value={form.subtitle} onChange={set('subtitle')} />
        </FormField>
        <FormField label="Placement" htmlFor="b-placement">
          <select id="b-placement" className="field" value={form.placement} onChange={set('placement')}>
            <option value="hero">Hero</option>
            <option value="promo">Promotional strip</option>
            <option value="category">Category page</option>
          </select>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Primary button label" htmlFor="b-plabel">
            <input id="b-plabel" className="field" value={form.primaryLabel} onChange={set('primaryLabel')} />
          </FormField>
          <FormField label="Primary button link" htmlFor="b-plink">
            <input id="b-plink" className="field" value={form.primaryLink} onChange={set('primaryLink')} placeholder="/shop" />
          </FormField>
          <FormField label="Secondary button label" htmlFor="b-slabel">
            <input id="b-slabel" className="field" value={form.secondaryLabel} onChange={set('secondaryLabel')} />
          </FormField>
          <FormField label="Secondary button link" htmlFor="b-slink">
            <input id="b-slink" className="field" value={form.secondaryLink} onChange={set('secondaryLink')} />
          </FormField>
        </div>
        <FormField label="Mobile image path" htmlFor="b-mobile" hint="Portrait crop used below 768px.">
          <input id="b-mobile" className="field" value={form.mobileImage} onChange={set('mobileImage')} />
        </FormField>
      </>
    ),
  },

  faqs: {
    title: 'FAQs',
    description: 'Questions shown on the FAQ page and in structured data.',
    endpoint: '/admin/faqs',
    singular: 'FAQ',
    empty: { question: '', answer: '', category: 'General', displayOrder: 0, isActive: true },
    activeKey: 'isActive',
    hasImage: false,
    columns: [
      { key: 'question', header: 'Question', render: (r) => (
        <div className="min-w-0 max-w-md">
          <p className="truncate text-sm font-medium">{r.question}</p>
          <p className="line-clamp-2 text-xs text-[var(--text-muted)]">{r.answer}</p>
        </div>
      ) },
      { key: 'category', header: 'Category', render: (r) => <span className="text-xs">{r.category}</span> },
    ],
    fields: (form, set) => (
      <>
        <FormField label="Question" htmlFor="f-question">
          <input id="f-question" className="field" maxLength={300} value={form.question} onChange={set('question')} required />
        </FormField>
        <FormField label="Answer" htmlFor="f-answer">
          <textarea id="f-answer" className="field" rows={5} maxLength={3000} value={form.answer} onChange={set('answer')} required />
        </FormField>
        <FormField label="Category" htmlFor="f-category" hint="Groups questions into filter chips.">
          <input id="f-category" className="field" value={form.category} onChange={set('category')} placeholder="Shipping" />
        </FormField>
      </>
    ),
  },
};

function ContentForm({ config, initial, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState({ ...config.empty, ...initial });
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const hasImage = config.hasImage !== false;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSave({
        ...form,
        displayOrder: Number(form.displayOrder) || 0,
        ...(form.rating !== undefined ? { rating: Number(form.rating) } : {}),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {config.fields(form, set)}

      {hasImage && (
        <FormField label="Image" hint="Pick one of the bundled photographs or type a path.">
          <div className="grid grid-cols-4 gap-2">
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
            className="field field-sm mt-2.5" value={form.image || ''}
            onChange={set('image')} placeholder="/images/…" aria-label="Image path"
          />
        </FormField>
      )}

      <FormField label="Display order" htmlFor="c-order" hint="Lower numbers appear first.">
        <input id="c-order" type="number" className="field" value={form.displayOrder} onChange={set('displayOrder')} />
      </FormField>

      <Toggle
        id="c-active"
        checked={!!form[config.activeKey]}
        onChange={(v) => setForm({ ...form, [config.activeKey]: v })}
        label="Visible on the storefront"
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

export default function AdminContent({ kind = 'testimonials' }) {
  const config = TYPES[kind] || TYPES.testimonials;
  const { data: rows, loading, error, refetch } = useFetch(config.endpoint, { deps: [kind] });
  const [editing, setEditing] = useState(null);
  const toast = useToast();

  useSeo({ title: config.title, noIndex: true });

  const save = async (form) => {
    try {
      if (form._id) await api.put(`${config.endpoint}/${form._id}`, form);
      else await api.post(config.endpoint, form);
      toast.success(`${config.title} saved.`);
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not save that item.');
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`${config.endpoint}/${id}`);
      toast.success('Deleted.');
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not delete that item.');
    }
  };

  const columns = [
    ...config.columns,
    {
      key: 'order',
      header: 'Order',
      hideOnMobile: true,
      render: (r) => <span className="text-sm tabular-nums">{r.displayOrder}</span>,
    },
    {
      key: 'active',
      header: 'Status',
      render: (r) => (
        <Badge tone={r[config.activeKey] ? 'success' : 'muted'}>
          {r[config.activeKey] ? 'Visible' : 'Hidden'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (r) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setEditing(r); }}
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
        title={config.title}
        description={config.description}
        action={(
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({})}>
            <Plus size={14} /> New {config.singular}
          </button>
        )}
      />

      <AdminTable
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onRowClick={setEditing}
        emptyTitle={`No ${config.title.toLowerCase()} yet`}
        emptyDescription="Add your first entry — it appears on the storefront immediately."
        emptyAction={(
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({})}>
            <Plus size={14} /> New {config.singular}
          </button>
        )}
      />

      <AdminDrawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? `Edit ${config.singular}` : `New ${config.singular}`}
      >
        {editing && (
          <ContentForm
            key={editing._id || 'new'}
            config={config}
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
