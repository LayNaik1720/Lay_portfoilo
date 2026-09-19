import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Star, ExternalLink } from 'lucide-react';
import {
  AdminPageHeader, FormField, Toggle, SaveButton, ConfirmDelete,
} from '../../components/admin/AdminUI.jsx';
import { SmartImage, LoadingSkeleton, ErrorState } from '../../components/ui/Primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatPrice } from '../../lib/format.js';

/** Images available in the repo — avoids needing an upload service for the demo. */
const IMAGE_LIBRARY = [
  '/images/collections/sarees.jpg',
  '/images/collections/lehengas.jpg',
  '/images/collections/kurtis.jpg',
  '/images/collections/indo-western.jpg',
  '/images/collections/dresses.jpg',
  '/images/collections/navratri.jpg',
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
];

const EMPTY = {
  name: '', sku: '', shortDescription: '', description: '',
  price: '', originalPrice: '', category: '', subcategory: '', collectionRef: '',
  images: [], variants: [], sizes: [], colors: [],
  fabric: '', material: '', careInstructions: '', tags: [],
  stock: 0, lowStockThreshold: 3,
  isNewArrival: false, isBestSeller: false, isFeatured: false,
  status: 'active', seoTitle: '', seoDescription: '',
};

/** Comma-separated list editor backed by an array. */
function ListInput({ id, label, value, onChange, placeholder, hint }) {
  return (
    <FormField label={label} htmlFor={id} hint={hint}>
      <input
        id={id}
        className="field"
        value={(value || []).join(', ')}
        placeholder={placeholder}
        onChange={(e) => onChange(
          e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
        )}
      />
    </FormField>
  );
}

export default function AdminProductForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const { data: existing, loading, error } = useFetch(`/admin/products/${id}`, { skip: isNew });
  const { data: categories } = useFetch('/categories');
  const { data: collections } = useFetch('/collections');

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useSeo({ title: isNew ? 'New product' : 'Edit product', noIndex: true });

  useEffect(() => {
    if (!existing) return;
    setForm({
      ...EMPTY,
      ...existing,
      category: existing.category?._id || existing.category || '',
      collectionRef: existing.collectionRef?._id || existing.collectionRef || '',
      originalPrice: existing.originalPrice ?? '',
    });
  }, [existing]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const onInput = (key) => (e) => set(key)(e.target.value);

  /* ---------------------------------------------------------- variants -- */

  const addVariant = () => setForm((f) => ({
    ...f,
    variants: [...f.variants, {
      sku: `${f.sku || 'SKU'}-${f.variants.length + 1}`,
      color: '', colorHex: '', size: 'Free Size',
      stock: 0, priceDelta: 0, image: '', isActive: true,
    }],
  }));

  const updateVariant = (index, key, value) => setForm((f) => ({
    ...f,
    variants: f.variants.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
  }));

  const removeVariant = (index) => setForm((f) => ({
    ...f,
    variants: f.variants.filter((_, i) => i !== index),
  }));

  // When variants exist they are the source of truth for total stock.
  const variantStock = useMemo(
    () => form.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0),
    [form.variants],
  );

  /* ------------------------------------------------------------ images -- */

  const toggleImage = (url) => setForm((f) => {
    const exists = f.images.find((img) => img.url === url);
    if (exists) {
      const images = f.images.filter((img) => img.url !== url);
      // Never leave the set without a primary.
      if (exists.isPrimary && images.length) images[0].isPrimary = true;
      return { ...f, images };
    }
    return {
      ...f,
      images: [...f.images, { url, alt: f.name || '', isPrimary: f.images.length === 0 }],
    };
  });

  const makePrimary = (url) => setForm((f) => ({
    ...f,
    images: f.images.map((img) => ({ ...img, isPrimary: img.url === url })),
  }));

  /* ------------------------------------------------------------ submit -- */

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Product name is required.';
    if (!form.sku.trim()) next.sku = 'SKU is required.';
    if (form.price === '' || Number(form.price) < 0) next.price = 'Enter a valid price.';
    if (!form.category) next.category = 'Choose a category.';
    if (form.originalPrice !== '' && Number(form.originalPrice) < Number(form.price)) {
      next.originalPrice = 'Original price should be above the selling price.';
    }
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error('Please correct the highlighted fields.');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        originalPrice: form.originalPrice === '' ? null : Number(form.originalPrice),
        collectionRef: form.collectionRef || null,
        stock: form.variants.length ? variantStock : Number(form.stock) || 0,
        lowStockThreshold: Number(form.lowStockThreshold) || 0,
        variants: form.variants.map((v) => ({
          ...v,
          stock: Number(v.stock) || 0,
          priceDelta: Number(v.priceDelta) || 0,
        })),
      };
      delete payload._id;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.__v;

      if (isNew) {
        const res = await api.post('/admin/products', payload);
        toast.success('Product created.');
        navigate(`/admin/products/${res.data._id}`, { replace: true });
      } else {
        await api.put(`/admin/products/${id}`, payload);
        toast.success('Product saved.');
      }
    } catch (err) {
      toast.error(err.message || 'Could not save this product.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/admin/products/${id}`);
      toast.success('Product deleted.');
      navigate('/admin/products');
    } catch (err) {
      toast.error(err.message || 'Could not delete this product.');
    }
  };

  if (!isNew && loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-10 w-64" />
        <LoadingSkeleton className="h-96 w-full" />
      </div>
    );
  }
  if (!isNew && error) return <ErrorState error={error} />;

  return (
    <form onSubmit={submit} noValidate>
      <Link to="/admin/products" className="mb-5 inline-flex items-center gap-2 text-sm link-underline">
        <ChevronLeft size={14} /> All products
      </Link>

      <AdminPageHeader
        title={isNew ? 'New product' : form.name || 'Edit product'}
        description={isNew ? 'Add a piece to the catalogue.' : `SKU ${form.sku}`}
        action={(
          <div className="flex items-center gap-3">
            {!isNew && form.slug && (
              <a
                href={`/product/${form.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <ExternalLink size={13} aria-hidden="true" /> View
              </a>
            )}
            <SaveButton busy={busy}>{isNew ? 'Create product' : 'Save changes'}</SaveButton>
          </div>
        )}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-5">
          {/* ---- basics */}
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="display-sm mb-5">Basics</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Product name" htmlFor="p-name" error={errors.name} className="sm:col-span-2">
                <input
                  id="p-name" className="field" value={form.name} onChange={onInput('name')} required
                  aria-invalid={errors.name ? 'true' : undefined}
                />
              </FormField>

              <FormField label="SKU" htmlFor="p-sku" error={errors.sku}>
                <input
                  id="p-sku" className="field" value={form.sku} onChange={onInput('sku')} required
                  aria-invalid={errors.sku ? 'true' : undefined}
                />
              </FormField>

              <FormField label="Slug" htmlFor="p-slug" hint="Leave blank to generate from the name.">
                <input id="p-slug" className="field" value={form.slug || ''} onChange={onInput('slug')} />
              </FormField>

              <FormField label="Short description" htmlFor="p-short" className="sm:col-span-2" hint="One line shown on cards and search results.">
                <input id="p-short" className="field" maxLength={300} value={form.shortDescription} onChange={onInput('shortDescription')} />
              </FormField>

              <FormField label="Full description" htmlFor="p-desc" className="sm:col-span-2">
                <textarea id="p-desc" className="field" rows={5} maxLength={8000} value={form.description} onChange={onInput('description')} />
              </FormField>
            </div>
          </section>

          {/* ---- pricing */}
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="display-sm mb-5">Pricing</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Selling price (₹)" htmlFor="p-price" error={errors.price}>
                <input
                  id="p-price" type="number" min="0" className="field" value={form.price} onChange={onInput('price')} required
                  aria-invalid={errors.price ? 'true' : undefined}
                />
              </FormField>

              <FormField
                label="Original price (₹)" htmlFor="p-original" error={errors.originalPrice}
                hint="Set only for a genuine reduction — it drives the sale badge."
              >
                <input
                  id="p-original" type="number" min="0" className="field"
                  value={form.originalPrice} onChange={onInput('originalPrice')}
                  aria-invalid={errors.originalPrice ? 'true' : undefined}
                />
              </FormField>
            </div>

            {form.originalPrice > form.price && form.price > 0 && (
              <p className="mt-3 text-xs text-[var(--sale)]">
                Shows as {Math.round(((form.originalPrice - form.price) / form.originalPrice) * 100)}% off
                — saving {formatPrice(form.originalPrice - form.price)}.
              </p>
            )}
          </section>

          {/* ---- imagery */}
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="display-sm mb-2">Imagery</h2>
            <p className="mb-5 text-xs text-[var(--text-muted)]">
              Pick from the images bundled with this build. To use your own, drop files into
              <code className="mx-1 text-[var(--text)]">client/public/images/products/</code>
              and add the path below.
            </p>

            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {IMAGE_LIBRARY.map((url) => {
                const selected = form.images.find((img) => img.url === url);
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => toggleImage(url)}
                    aria-pressed={!!selected}
                    className={`relative overflow-hidden border-2 transition-colors ${
                      selected ? 'border-[var(--primary)]' : 'border-transparent hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <SmartImage src={url} alt="" ratio="3/4" />
                    {selected?.isPrimary && (
                      <span className="absolute left-1 top-1 bg-[var(--primary)] px-1.5 py-0.5 text-[0.5625rem] uppercase tracking-wider text-white">
                        Primary
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {form.images.length > 0 && (
              <ul className="mt-4 space-y-2">
                {form.images.map((img) => (
                  <li key={img.url} className="flex items-center gap-3 border border-[var(--border)] p-2">
                    <div className="w-9 shrink-0">
                      <SmartImage src={img.url} alt="" ratio="3/4" />
                    </div>
                    <input
                      className="field field-sm min-w-0 flex-1"
                      value={img.url}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        images: f.images.map((i) => (i.url === img.url ? { ...i, url: e.target.value } : i)),
                      }))}
                      aria-label="Image path"
                    />
                    <button
                      type="button"
                      onClick={() => makePrimary(img.url)}
                      aria-label="Make primary image"
                      className={`icon-btn h-8 w-8 ${img.isPrimary ? 'text-[var(--gold)]' : 'text-[var(--text-muted)]'}`}
                    >
                      <Star size={14} fill={img.isPrimary ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleImage(img.url)}
                      aria-label="Remove image"
                      className="icon-btn h-8 w-8 text-[var(--text-muted)] hover:text-[var(--error)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => setForm((f) => ({
                ...f,
                images: [...f.images, { url: '', alt: f.name, isPrimary: f.images.length === 0 }],
              }))}
              className="btn btn-outline btn-sm mt-3"
            >
              <Plus size={13} /> Add image path
            </button>
          </section>

          {/* ---- variants */}
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="display-sm">Variants</h2>
              <button type="button" onClick={addVariant} className="btn btn-outline btn-sm">
                <Plus size={13} /> Add variant
              </button>
            </div>
            <p className="mb-5 text-xs text-[var(--text-muted)]">
              Each colour/size combination tracks its own stock. When variants exist the
              product’s total stock is their sum ({variantStock} units).
            </p>

            {form.variants.length === 0 ? (
              <p className="border border-dashed border-[var(--border-strong)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                No variants — the product uses a single stock figure.
              </p>
            ) : (
              <ul className="space-y-3">
                {form.variants.map((variant, index) => (
                  <li key={variant._id || index} className="border border-[var(--border)] p-3">
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
                      <FormField label="SKU" htmlFor={`v-sku-${index}`} className="lg:col-span-2">
                        <input
                          id={`v-sku-${index}`} className="field field-sm" value={variant.sku}
                          onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                        />
                      </FormField>
                      <FormField label="Colour" htmlFor={`v-color-${index}`}>
                        <input
                          id={`v-color-${index}`} className="field field-sm" value={variant.color}
                          onChange={(e) => updateVariant(index, 'color', e.target.value)}
                        />
                      </FormField>
                      <FormField label="Hex" htmlFor={`v-hex-${index}`}>
                        <input
                          id={`v-hex-${index}`} className="field field-sm" value={variant.colorHex} placeholder="#1F3D2F"
                          onChange={(e) => updateVariant(index, 'colorHex', e.target.value)}
                        />
                      </FormField>
                      <FormField label="Size" htmlFor={`v-size-${index}`}>
                        <input
                          id={`v-size-${index}`} className="field field-sm" value={variant.size}
                          onChange={(e) => updateVariant(index, 'size', e.target.value)}
                        />
                      </FormField>
                      <FormField label="Stock" htmlFor={`v-stock-${index}`}>
                        <input
                          id={`v-stock-${index}`} type="number" min="0" className="field field-sm" value={variant.stock}
                          onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                        />
                      </FormField>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <Toggle
                        id={`v-active-${index}`}
                        checked={variant.isActive !== false}
                        onChange={(v) => updateVariant(index, 'isActive', v)}
                        label="Active"
                      />
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--error)]"
                      >
                        <Trash2 size={12} aria-hidden="true" /> Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---- attributes */}
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="display-sm mb-5">Attributes</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Fabric" htmlFor="p-fabric">
                <input id="p-fabric" className="field" value={form.fabric} onChange={onInput('fabric')} />
              </FormField>
              <FormField label="Material" htmlFor="p-material">
                <input id="p-material" className="field" value={form.material} onChange={onInput('material')} />
              </FormField>
              <ListInput
                id="p-sizes" label="Sizes" value={form.sizes} onChange={set('sizes')}
                placeholder="S, M, L, XL" hint="Comma separated."
              />
              <ListInput
                id="p-colors" label="Colours" value={form.colors} onChange={set('colors')}
                placeholder="Ivory, Forest Green" hint="Comma separated."
              />
              <ListInput
                id="p-tags" label="Tags" value={form.tags} onChange={set('tags')}
                placeholder="festive, handwoven" hint="Used by search and filters."
              />
              <FormField label="Subcategory" htmlFor="p-subcategory">
                <input id="p-subcategory" className="field" value={form.subcategory} onChange={onInput('subcategory')} />
              </FormField>
              <FormField label="Care instructions" htmlFor="p-care" className="sm:col-span-2">
                <textarea id="p-care" className="field" rows={2} value={form.careInstructions} onChange={onInput('careInstructions')} />
              </FormField>
            </div>
          </section>

          {/* ---- SEO */}
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="display-sm mb-5">Search engine listing</h2>
            <div className="space-y-4">
              <FormField label="SEO title" htmlFor="p-seotitle" hint="Defaults to the product name.">
                <input id="p-seotitle" className="field" maxLength={200} value={form.seoTitle} onChange={onInput('seoTitle')} />
              </FormField>
              <FormField label="Meta description" htmlFor="p-seodesc" hint="Around 150 characters reads best.">
                <textarea id="p-seodesc" className="field" rows={2} maxLength={400} value={form.seoDescription} onChange={onInput('seoDescription')} />
              </FormField>
            </div>
          </section>
        </div>

        {/* ---- sidebar */}
        <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="display-sm mb-4">Organisation</h2>
            <div className="space-y-4">
              <FormField label="Status" htmlFor="p-status">
                <select id="p-status" className="field" value={form.status} onChange={onInput('status')}>
                  <option value="active">Active — visible in the shop</option>
                  <option value="draft">Draft — hidden</option>
                  <option value="archived">Archived</option>
                </select>
              </FormField>

              <FormField label="Category" htmlFor="p-category" error={errors.category}>
                <select
                  id="p-category" className="field" value={form.category} onChange={onInput('category')} required
                  aria-invalid={errors.category ? 'true' : undefined}
                >
                  <option value="">Select a category</option>
                  {categories?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </FormField>

              <FormField label="Collection" htmlFor="p-collection">
                <select id="p-collection" className="field" value={form.collectionRef} onChange={onInput('collectionRef')}>
                  <option value="">None</option>
                  {collections?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </FormField>
            </div>
          </section>

          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="display-sm mb-4">Inventory</h2>
            <div className="space-y-4">
              <FormField
                label="Stock" htmlFor="p-stock"
                hint={form.variants.length ? 'Managed by variants.' : 'Units available to sell.'}
              >
                <input
                  id="p-stock" type="number" min="0" className="field"
                  value={form.variants.length ? variantStock : form.stock}
                  onChange={onInput('stock')}
                  disabled={form.variants.length > 0}
                />
              </FormField>
              <FormField label="Low stock threshold" htmlFor="p-low" hint="Triggers the “only n left” badge.">
                <input id="p-low" type="number" min="0" className="field" value={form.lowStockThreshold} onChange={onInput('lowStockThreshold')} />
              </FormField>
            </div>
          </section>

          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="display-sm mb-4">Merchandising</h2>
            <div className="space-y-3.5">
              <Toggle
                id="p-new" checked={form.isNewArrival} onChange={set('isNewArrival')}
                label="New arrival" hint="Shows in the New Arrivals rail."
              />
              <Toggle
                id="p-best" checked={form.isBestSeller} onChange={set('isBestSeller')}
                label="Best seller" hint="Manual flag; the homepage rail uses real sales."
              />
              <Toggle
                id="p-featured" checked={form.isFeatured} onChange={set('isFeatured')}
                label="Featured" hint="Highlighted across the storefront."
              />
            </div>
          </section>

          <div className="flex items-center justify-between gap-3">
            <SaveButton busy={busy}>{isNew ? 'Create product' : 'Save changes'}</SaveButton>
            {!isNew && <ConfirmDelete onConfirm={remove} label="Delete product" />}
          </div>
        </aside>
      </div>
    </form>
  );
}
