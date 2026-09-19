import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ShoppingBag, Minus, Plus, Trash2, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { SmartImage, EmptyState } from './ui/Primitives.jsx';
import { formatPrice } from '../lib/format.js';

export function CartDrawer() {
  const cart = useCart();
  const toast = useToast();
  const { drawerOpen, closeDrawer, items, totals } = cart;

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  async function change(item, quantity) {
    try {
      await cart.updateQuantity(item, quantity);
    } catch (err) {
      toast.error(err.message || 'We could not update your bag');
    }
  }

  async function remove(item) {
    try {
      await cart.removeItem(item);
      toast.info('Removed from your bag');
    } catch (err) {
      toast.error(err.message || 'We could not remove that');
    }
  }

  const progress = totals.freeShippingThreshold
    ? Math.min(100, ((totals.subtotal - totals.discount) / totals.freeShippingThreshold) * 100)
    : 100;

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-[100] bg-[rgba(28,33,29,0.45)]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-[101] flex w-full max-w-md flex-col bg-[var(--background)]"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping bag"
          >
            <header className="flex items-center justify-between border-b border-[var(--border)] px-5" style={{ height: 'var(--header-height)' }}>
              <h2 className="eyebrow">Your bag ({cart.count})</h2>
              <button type="button" onClick={closeDrawer} aria-label="Close bag" className="-mr-2 grid h-11 w-11 place-items-center">
                <X size={19} strokeWidth={1.5} />
              </button>
            </header>

            {items.length === 0 ? (
              <div className="flex flex-1 items-center">
                <EmptyState
                  icon={ShoppingBag}
                  title="Your bag is empty"
                  description="Pieces you add will appear here."
                  action={<button type="button" onClick={closeDrawer} className="btn btn-primary">Continue shopping</button>}
                />
              </div>
            ) : (
              <>
                {/* free shipping progress */}
                <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-5 py-3.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Truck size={14} strokeWidth={1.5} className="shrink-0 text-[var(--primary)]" />
                    {totals.qualifiesForFreeShipping ? (
                      <span className="font-medium text-[var(--success)]">Free shipping unlocked</span>
                    ) : (
                      <span>
                        Add <strong className="font-medium">{formatPrice(totals.amountToFreeShipping)}</strong> more for free shipping
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-[3px] w-full overflow-hidden bg-[var(--border)]">
                    <motion.div
                      className="h-full bg-[var(--primary)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>

                <ul className="flex-1 overflow-y-auto overscroll-contain px-5">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.li
                        key={item.id || `${item.product.id}-${item.variantId}`}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden border-b border-[var(--border)] last:border-0"
                      >
                        <div className="flex gap-4 py-4">
                          <Link to={`/product/${item.product.slug}`} onClick={closeDrawer} className="w-20 shrink-0">
                            <SmartImage src={item.product.image} alt={item.product.name} ratio="3/4" />
                          </Link>

                          <div className="flex min-w-0 flex-1 flex-col">
                            <Link to={`/product/${item.product.slug}`} onClick={closeDrawer} className="text-sm leading-snug hover:underline">
                              {item.product.name}
                            </Link>
                            {(item.color || item.size) && (
                              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                {[item.color, item.size].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            {!item.inStock && (
                              <p className="mt-1 text-xs text-[var(--error)]">
                                {item.availableStock === 0 ? 'Out of stock' : `Only ${item.availableStock} left`}
                              </p>
                            )}

                            <div className="mt-auto flex items-center justify-between pt-3">
                              <div className="flex items-center border border-[var(--border)]">
                                <button
                                  type="button"
                                  onClick={() => change(item, item.quantity - 1)}
                                  disabled={cart.busy}
                                  aria-label="Decrease quantity"
                                  className="grid h-8 w-8 place-items-center transition hover:bg-[var(--surface-muted)] disabled:opacity-40"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => change(item, item.quantity + 1)}
                                  disabled={cart.busy || item.quantity >= item.availableStock}
                                  aria-label="Increase quantity"
                                  className="grid h-8 w-8 place-items-center transition hover:bg-[var(--surface-muted)] disabled:opacity-40"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium">{formatPrice(item.lineTotal)}</span>
                                <button
                                  type="button"
                                  onClick={() => remove(item)}
                                  aria-label={`Remove ${item.product.name}`}
                                  className="text-[var(--text-muted)] transition hover:text-[var(--error)]"
                                >
                                  <Trash2 size={14} strokeWidth={1.5} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-5 py-5">
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-[var(--text-muted)]">Subtotal</dt>
                      <dd>{formatPrice(totals.subtotal)}</dd>
                    </div>
                    {totals.discount > 0 && (
                      <div className="flex justify-between text-[var(--success)]">
                        <dt>Discount {totals.couponCode && `(${totals.couponCode})`}</dt>
                        <dd>−{formatPrice(totals.discount)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-[var(--text-muted)]">Shipping</dt>
                      <dd>{totals.shippingFee === 0 ? 'Free' : formatPrice(totals.shippingFee)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-[var(--border)] pt-2.5 text-base">
                      <dt className="font-medium">Total</dt>
                      <dd className="font-medium">{formatPrice(totals.total)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 grid gap-2">
                    <Link to="/checkout" onClick={closeDrawer} className="btn btn-primary btn-block">
                      Checkout
                    </Link>
                    <Link to="/cart" onClick={closeDrawer} className="btn btn-outline btn-block">
                      View bag
                    </Link>
                  </div>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
