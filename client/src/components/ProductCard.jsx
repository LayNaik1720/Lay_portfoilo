import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Plus, Check } from 'lucide-react';
import { SmartImage, PriceDisplay, Badge, Rating } from './ui/Primitives.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { discountPercent } from '../lib/format.js';

/**
 * Editorial product card.
 * Hover reveals the second image and a quick-add control; the whole card is a
 * single link for accessibility, with interactive controls layered above it.
 */
export function ProductCard({ product, priority = false, className = '' }) {
  const wishlist = useWishlist();
  const cart = useCart();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const id = product._id || product.id;
  const images = product.images || [];
  const primary = images.find((i) => i.isPrimary)?.url || images[0]?.url || '';
  const secondary = images[1]?.url;
  const pct = discountPercent(product.price, product.originalPrice);
  const outOfStock = (product.stock ?? 0) <= 0;
  const lowStock = !outOfStock && product.stock <= (product.lowStockThreshold ?? 3);
  const isWishlisted = wishlist.has(id);

  // A product with multiple variants needs a choice, so send those to the PDP.
  const needsVariantChoice = (product.variants?.length || 0) > 1;

  async function handleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const nowIn = await wishlist.toggle(id);
      toast.success(nowIn ? 'Saved to your wishlist' : 'Removed from your wishlist');
    } catch {
      toast.error('We could not update your wishlist');
    }
  }

  async function handleQuickAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || adding) return;

    setAdding(true);
    try {
      const variantId = product.variants?.length === 1 ? product.variants[0]._id : null;
      await cart.addItem({ productId: id, variantId, quantity: 1 });
      setAdded(true);
      toast.success(`${product.name} added to your bag`);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      toast.error(err.message || 'We could not add that to your bag');
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className={`group relative flex flex-col ${className}`}>
      <Link
        to={`/product/${product.slug}`}
        className="flex flex-col focus-visible:outline-offset-4"
        aria-label={product.name}
      >
        <div className="relative image-zoom bg-[var(--surface-muted)]">
          <SmartImage
            src={primary}
            alt={images[0]?.alt || product.name}
            ratio="3/4"
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* Second image fades in on hover where one exists. */}
          {secondary && (
            <img
              src={secondary}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            />
          )}

          {/* Flags */}
          <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5 sm:left-3 sm:top-3">
            {pct > 0 && <Badge tone="sale">{pct}% off</Badge>}
            {product.isNewArrival && pct === 0 && <Badge tone="dark">New</Badge>}
            {outOfStock && <Badge tone="neutral">Sold out</Badge>}
            {lowStock && !outOfStock && <Badge tone="gold">Only {product.stock} left</Badge>}
          </div>

          {/* Wishlist */}
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            aria-pressed={isWishlisted}
            className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center bg-[rgba(255,255,255,0.9)] text-[var(--text)] transition duration-300 hover:bg-white sm:right-3 sm:top-3"
          >
            <motion.span
              animate={isWishlisted ? { scale: [1, 1.28, 1] } : { scale: 1 }}
              transition={{ duration: 0.34 }}
              className="grid place-items-center"
            >
              <Heart
                size={15}
                strokeWidth={1.6}
                fill={isWishlisted ? 'var(--accent)' : 'none'}
                color={isWishlisted ? 'var(--accent)' : 'currentColor'}
              />
            </motion.span>
          </button>

          {/* Quick add — always reachable on touch, revealed on hover on desktop */}
          {!outOfStock && (
            <div className="absolute inset-x-2.5 bottom-2.5 sm:inset-x-3 sm:bottom-3 md:translate-y-2 md:opacity-0 md:transition-all md:duration-500 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-within:translate-y-0 md:focus-within:opacity-100">
              {needsVariantChoice ? (
                <span className="btn btn-light btn-sm btn-block pointer-events-none">Select options</span>
              ) : (
                <button
                  type="button"
                  onClick={handleQuickAdd}
                  disabled={adding}
                  className="btn btn-light btn-sm btn-block"
                  aria-label={`Add ${product.name} to bag`}
                >
                  {added ? <><Check size={13} /> Added</> : <><Plus size={13} /> Quick add</>}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 pt-3.5">
          {product.category?.name && (
            <p className="eyebrow-sm text-[var(--text-muted)]">{product.category.name}</p>
          )}
          <h3 className="text-[0.9375rem] font-normal leading-snug tracking-tight">
            {product.name}
          </h3>

          <PriceDisplay price={product.price} originalPrice={product.originalPrice} />

          <div className="mt-0.5 flex items-center gap-3">
            {product.ratingCount > 0 && (
              <Rating value={product.ratingAverage} count={product.ratingCount} />
            )}
            {/* Colour swatches give a sense of variety without leaving the grid. */}
            {product.colors?.length > 0 && (
              <div className="flex items-center gap-1" aria-label={`Available in ${product.colors.join(', ')}`}>
                {product.variants?.length
                  ? [...new Map(product.variants.filter((v) => v.colorHex).map((v) => [v.color, v])).values()]
                    .slice(0, 4)
                    .map((v) => (
                      <span
                        key={v.color}
                        title={v.color}
                        className="h-2.5 w-2.5 rounded-full border border-[var(--border-strong)]"
                        style={{ background: v.colorHex }}
                      />
                    ))
                  : null}
                {product.colors.length > 4 && (
                  <span className="text-[0.625rem] text-[var(--text-muted)]">+{product.colors.length - 4}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products, className = '', priorityCount = 4 }) {
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 md:gap-x-6 md:gap-y-14 lg:grid-cols-4 ${className}`}>
      {products.map((p, i) => (
        <ProductCard key={p._id || p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
