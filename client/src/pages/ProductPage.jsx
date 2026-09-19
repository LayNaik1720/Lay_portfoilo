import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart, MessageCircle, Truck, RefreshCcw, ShieldCheck, Minus, Plus, ChevronDown,
} from 'lucide-react';
import { ProductGallery } from '../components/ProductGallery.jsx';
import { ReviewSection } from '../components/ReviewSection.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import {
  PriceDisplay, Badge, Rating, LoadingSkeleton, ErrorState, EmptyState, Reveal,
} from '../components/ui/Primitives.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useSeo } from '../hooks/useSeo.js';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useStorefront } from '../context/StorefrontContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatPrice, discountPercent, whatsappLink } from '../lib/format.js';

/* ------------------------------------------------------------- accordion -- */

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--border)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-sm font-medium">{title}</span>
        <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="pb-5 text-sm leading-relaxed text-[var(--text-muted)]"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- loading -- */

function ProductSkeleton() {
  return (
    <div className="shell py-8 md:py-14">
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <LoadingSkeleton className="aspect-[4/5] w-full" />
        <div className="space-y-4">
          <LoadingSkeleton className="h-3 w-24" />
          <LoadingSkeleton className="h-10 w-3/4" />
          <LoadingSkeleton className="h-6 w-32" />
          <LoadingSkeleton className="h-20 w-full" />
          <LoadingSkeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page -- */

export default function ProductPage() {
  const { slug } = useParams();
  const { data, loading, error, refetch } = useFetch(`/products/${slug}`);
  const { addItem, busy, openDrawer } = useCart();
  const wishlist = useWishlist();
  const { settings } = useStorefront();
  const toast = useToast();

  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [attempted, setAttempted] = useState(false);

  const product = data?.product;
  const related = data?.related || [];
  const reviews = data?.reviews || [];

  // Preselect the first available option so the page is usable in one tap.
  useEffect(() => {
    if (!product) return;
    setSize(null);
    setColor(product.colors?.length === 1 ? product.colors[0] : null);
    setQuantity(1);
    setImageIndex(0);
    setAttempted(false);
  }, [product?._id]);

  const variants = product?.variants?.filter((v) => v.isActive !== false) || [];
  const hasVariants = variants.length > 0;

  /** The variant matching the current size/colour selection. */
  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null;
    return variants.find((v) => {
      const sizeOk = !v.size || !size ? v.size === size : v.size === size;
      const colorOk = !v.color ? !color : v.color === color;
      return sizeOk && colorOk;
    }) || null;
  }, [variants, size, color, hasVariants]);

  const sizes = useMemo(() => {
    if (hasVariants) return [...new Set(variants.map((v) => v.size).filter(Boolean))];
    return product?.sizes || [];
  }, [variants, product, hasVariants]);

  const colors = useMemo(() => {
    if (hasVariants) {
      const map = new Map();
      variants.forEach((v) => { if (v.color && !map.has(v.color)) map.set(v.color, v.colorHex); });
      return [...map].map(([name, hex]) => ({ name, hex }));
    }
    return (product?.colors || []).map((name) => ({ name, hex: null }));
  }, [variants, product, hasVariants]);

  /** Stock for a given size, respecting the chosen colour. */
  const stockForSize = (s) => {
    if (!hasVariants) return product?.stock ?? 0;
    return variants
      .filter((v) => v.size === s && (!color || v.color === color))
      .reduce((sum, v) => sum + (v.stock || 0), 0);
  };

  const availableStock = hasVariants
    ? (selectedVariant ? selectedVariant.stock : variants.reduce((s, v) => s + (v.stock || 0), 0))
    : (product?.stock ?? 0);

  const needsSize = sizes.length > 0 && !size;
  const needsColor = colors.length > 1 && !color;
  const soldOut = (product?.stock ?? 0) <= 0;
  const price = (product?.price || 0) + (selectedVariant?.priceDelta || 0);

  const seoImage = product?.images?.[0]?.url;
  useSeo({
    title: product ? (product.seoTitle || product.name) : 'Loading',
    description: product?.seoDescription || product?.shortDescription,
    image: seoImage,
    type: 'product',
    jsonLd: product ? {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.shortDescription || product.description,
      sku: product.sku,
      image: (product.images || []).map((i) => `${window.location.origin}${i.url}`),
      brand: { '@type': 'Brand', name: settings?.brand?.name || 'AARAVA' },
      material: product.fabric,
      offers: {
        '@type': 'Offer',
        url: window.location.href,
        priceCurrency: 'INR',
        price: product.price,
        availability: product.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
      ...(product.ratingCount > 0 && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: product.ratingAverage,
          reviewCount: product.ratingCount,
        },
      }),
    } : null,
  });

  if (loading) return <ProductSkeleton />;
  if (error) {
    return (
      <div className="shell section">
        {error.status === 404 ? (
          <EmptyState
            title="This piece is no longer available"
            description="It may have sold out or been retired from the collection."
            action={<Link to="/shop" className="btn btn-primary">Browse the collection</Link>}
          />
        ) : (
          <ErrorState error={error} onRetry={refetch} />
        )}
      </div>
    );
  }
  if (!product) return null;

  const handleAdd = async () => {
    setAttempted(true);
    if (needsSize || needsColor) {
      toast.error(needsSize ? 'Please choose a size.' : 'Please choose a colour.');
      return;
    }
    if (availableStock <= 0) {
      toast.error('That option is sold out.');
      return;
    }
    const ok = await addItem({
      productId: product._id,
      variantId: selectedVariant?._id || null,
      quantity,
    });
    if (ok !== false) openDrawer();
  };

  const wished = wishlist.has(product._id);
  const waNumber = settings?.contact?.whatsapp;
  const waMessage = `Hello! I'd like to know more about ${product.name} (SKU: ${product.sku}) — ${window.location.href}`;

  return (
    <>
      <div className="shell pt-5 md:pt-8">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <li><Link to="/" className="link-underline">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to="/shop" className="link-underline">Shop</Link></li>
            {product.category && (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link to={`/category/${product.category.slug}`} className="link-underline">
                    {product.category.name}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="truncate text-[var(--text)]">{product.name}</li>
          </ol>
        </nav>
      </div>

      <div className="shell py-6 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          {/* ------------------------------------------------------ gallery */}
          <div className="-mx-5 md:mx-0">
            <ProductGallery
              images={product.images}
              name={product.name}
              activeIndex={imageIndex}
              onActiveIndexChange={setImageIndex}
            />
          </div>

          {/* --------------------------------------------------- buy column */}
          <div className="lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:self-start">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {product.isNewArrival && <Badge tone="primary">New</Badge>}
              {product.isOnSale && product.originalPrice > product.price && (
                <Badge tone="sale">{discountPercent(product.price, product.originalPrice)}% off</Badge>
              )}
              {product.isBestSeller && <Badge tone="gold">Best seller</Badge>}
              {soldOut && <Badge tone="muted">Sold out</Badge>}
            </div>

            <h1 className="display-lg">{product.name}</h1>

            {product.ratingCount > 0 && (
              <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Rating value={product.ratingAverage} size={13} />
                <span className="link-underline">{product.ratingCount} review{product.ratingCount === 1 ? '' : 's'}</span>
              </a>
            )}

            <div className="mt-4">
              <PriceDisplay price={price} originalPrice={product.originalPrice} size="lg" />
              <p className="mt-1 text-xs text-[var(--text-muted)]">Inclusive of all taxes · SKU {selectedVariant?.sku || product.sku}</p>
            </div>

            {product.shortDescription && (
              <p className="mt-5 text-sm leading-relaxed text-[var(--text-muted)]">{product.shortDescription}</p>
            )}

            {/* ---- colour */}
            {colors.length > 0 && (
              <div className="mt-7">
                <div className="mb-2.5 flex items-baseline justify-between">
                  <span className="field-label mb-0">Colour{color ? `: ${color}` : ''}</span>
                  {attempted && needsColor && <span className="text-xs text-[var(--error)]">Select a colour</span>}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {colors.map((c) => {
                    const active = color === c.name;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        aria-pressed={active}
                        onClick={() => { setColor(active ? null : c.name); setSize(null); }}
                        title={c.name}
                        className={`flex items-center gap-2 border px-3 py-2 text-xs transition-colors ${
                          active
                            ? 'border-[var(--primary)] text-[var(--text)]'
                            : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {c.hex && (
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-[var(--border-strong)]"
                            style={{ background: c.hex }}
                            aria-hidden="true"
                          />
                        )}
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ---- size */}
            {sizes.length > 0 && (
              <div className="mt-6">
                <div className="mb-2.5 flex items-baseline justify-between">
                  <span className="field-label mb-0">Size{size ? `: ${size}` : ''}</span>
                  {attempted && needsSize && <span className="text-xs text-[var(--error)]">Select a size</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => {
                    const stock = stockForSize(s);
                    const disabled = stock <= 0;
                    const active = size === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={disabled}
                        aria-pressed={active}
                        onClick={() => setSize(active ? null : s)}
                        className={`relative min-w-[3.25rem] border px-4 py-2.5 text-xs transition-colors ${
                          active
                            ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--text-inverse)]'
                            : disabled
                              ? 'cursor-not-allowed border-[var(--border)] text-[var(--text-muted)] opacity-45'
                              : 'border-[var(--border-strong)] text-[var(--text)] hover:border-[var(--primary)]'
                        }`}
                      >
                        {s}
                        {disabled && (
                          <span className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
                            <span className="h-px w-full rotate-[-20deg] bg-[var(--border-strong)]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {size && availableStock > 0 && availableStock <= (product.lowStockThreshold || 3) && (
                  <p className="mt-2.5 text-xs text-[var(--accent)]">
                    Only {availableStock} left in this option
                  </p>
                )}
              </div>
            )}

            {/* ---- quantity + add */}
            <div className="mt-7 flex flex-wrap items-stretch gap-3">
              <div className="flex items-center border border-[var(--border-strong)]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="grid h-full w-11 place-items-center text-[var(--text-muted)] transition-colors hover:text-[var(--text)] disabled:opacity-35"
                >
                  <Minus size={14} />
                </button>
                <span className="w-9 text-center text-sm tabular-nums" aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(20, availableStock || 20, q + 1))}
                  disabled={quantity >= Math.min(20, availableStock || 20)}
                  aria-label="Increase quantity"
                  className="grid h-full w-11 place-items-center text-[var(--text-muted)] transition-colors hover:text-[var(--text)] disabled:opacity-35"
                >
                  <Plus size={14} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={busy || soldOut}
                className="btn btn-primary flex-1 min-w-[12rem]"
              >
                {soldOut ? 'Sold out' : busy ? 'Adding…' : 'Add to bag'}
              </button>

              <button
                type="button"
                onClick={() => wishlist.toggle(product._id)}
                aria-pressed={wished}
                aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
                className={`grid w-[46px] place-items-center border transition-colors ${
                  wished
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                }`}
              >
                <Heart size={17} fill={wished ? 'currentColor' : 'none'} />
              </button>
            </div>

            {waNumber && (
              <a
                href={whatsappLink(waNumber, waMessage)}
                target="_blank" rel="noreferrer noopener"
                className="btn btn-outline mt-3 w-full"
              >
                <MessageCircle size={15} /> Ask about this product
              </a>
            )}

            {/* ---- reassurance */}
            <ul className="mt-7 grid grid-cols-1 gap-3 border-y border-[var(--border)] py-5 sm:grid-cols-3">
              {[
                { Icon: Truck, text: `Free shipping over ${formatPrice(settings?.shipping?.freeShippingThreshold ?? 1000)}` },
                { Icon: RefreshCcw, text: `${settings?.shipping?.returnWindowDays ?? 7}-day easy returns` },
                { Icon: ShieldCheck, text: 'Handmade & quality checked' },
              ].map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-xs text-[var(--text-muted)]">
                  <Icon size={15} strokeWidth={1.4} className="shrink-0 text-[var(--primary)]" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>

            {/* ---- details */}
            <div className="mt-2">
              <Accordion title="Description" defaultOpen>
                <p>{product.description}</p>
                {product.tags?.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {product.tags.map((t) => (
                      <li key={t}>
                        <Link
                          to={`/shop?tag=${encodeURIComponent(t)}`}
                          className="inline-block border border-[var(--border)] px-2.5 py-1 text-[0.6875rem] text-[var(--text-muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--text)]"
                        >
                          {t}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Accordion>

              <Accordion title="Fabric & material">
                <dl className="space-y-2">
                  {product.fabric && (
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 text-[var(--text)]">Fabric</dt>
                      <dd>{product.fabric}</dd>
                    </div>
                  )}
                  {product.material && (
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 text-[var(--text)]">Material</dt>
                      <dd>{product.material}</dd>
                    </div>
                  )}
                  {product.category && (
                    <div className="flex gap-3">
                      <dt className="w-24 shrink-0 text-[var(--text)]">Category</dt>
                      <dd>{product.category.name}</dd>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <dt className="w-24 shrink-0 text-[var(--text)]">SKU</dt>
                    <dd>{product.sku}</dd>
                  </div>
                </dl>
              </Accordion>

              {product.careInstructions && (
                <Accordion title="Care instructions">
                  <p>{product.careInstructions}</p>
                </Accordion>
              )}

              <Accordion title="Shipping & returns">
                <p>
                  Dispatched within {settings?.shipping?.dispatchDays ?? 2} business days.
                  Free shipping on orders above {formatPrice(settings?.shipping?.freeShippingThreshold ?? 1000)};
                  a flat {formatPrice(settings?.shipping?.shippingCharge ?? 79)} applies below that.
                  Returns accepted within {settings?.shipping?.returnWindowDays ?? 7} days of delivery,
                  unworn and with tags attached.
                </p>
                <Link to="/shipping-policy" className="mt-3 inline-block text-sm link-underline">
                  Read the full policy
                </Link>
              </Accordion>
            </div>
          </div>
        </div>
      </div>

      <ReviewSection product={product} initialReviews={reviews} />

      {related.length > 0 && (
        <section className="section border-t border-[var(--border)] bg-[var(--surface-muted)]" aria-labelledby="related-heading">
          <div className="shell">
            <h2 id="related-heading" className="display-lg mb-10">You may also like</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-6">
              {related.map((p, i) => (
                <Reveal key={p._id} delay={Math.min(i * 0.06, 0.28)}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
