import { Link } from 'react-router-dom';
import { Minus, Plus, X, AlertTriangle } from 'lucide-react';
import { SmartImage } from './ui/Primitives.jsx';
import { formatPrice } from '../lib/format.js';
import { useCart } from '../context/CartContext.jsx';

/**
 * A single cart line. Shared by the cart page and (in compact form) elsewhere.
 * Stacks as a media row on mobile rather than pretending to be a table.
 */
export function CartLine({ item, readOnly = false }) {
  const { updateQuantity, removeItem, busy } = useCart();
  const product = item.product || {};
  const max = Math.min(20, item.availableStock || 20);
  const outOfStock = item.inStock === false || (item.availableStock ?? 0) <= 0;
  const overStock = !outOfStock && item.quantity > (item.availableStock ?? 0);

  return (
    <li className="flex gap-4 py-6">
      <Link
        to={`/product/${product.slug}`}
        className="w-[5.5rem] shrink-0 sm:w-28"
        tabIndex={readOnly ? -1 : 0}
      >
        <SmartImage src={product.image} alt={product.name} ratio="3/4" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-medium leading-snug">
              <Link to={`/product/${product.slug}`} className="link-underline">{product.name}</Link>
            </h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {[item.size, item.color].filter(Boolean).join(' · ') || product.sku}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)] sm:hidden">
              {formatPrice(item.unitPrice)} each
            </p>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() => removeItem(item)}
              disabled={busy}
              aria-label={`Remove ${product.name} from bag`}
              className="icon-btn -mr-2 -mt-2 h-8 w-8 text-[var(--text-muted)]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {(outOfStock || overStock) && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--error)]">
            <AlertTriangle size={13} aria-hidden="true" />
            {outOfStock ? 'Sold out — please remove' : `Only ${item.availableStock} left`}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          {readOnly ? (
            <p className="text-xs text-[var(--text-muted)]">Qty {item.quantity}</p>
          ) : (
            <div className="flex items-center border border-[var(--border)]">
              <button
                type="button"
                onClick={() => updateQuantity(item, item.quantity - 1)}
                disabled={busy || item.quantity <= 1}
                aria-label="Decrease quantity"
                className="grid h-9 w-9 place-items-center text-[var(--text-muted)] transition-colors hover:text-[var(--text)] disabled:opacity-35"
              >
                <Minus size={13} />
              </button>
              <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
              <button
                type="button"
                onClick={() => updateQuantity(item, item.quantity + 1)}
                disabled={busy || item.quantity >= max}
                aria-label="Increase quantity"
                className="grid h-9 w-9 place-items-center text-[var(--text-muted)] transition-colors hover:text-[var(--text)] disabled:opacity-35"
              >
                <Plus size={13} />
              </button>
            </div>
          )}

          <div className="text-right">
            <p className="text-sm font-medium tabular-nums">{formatPrice(item.lineTotal)}</p>
            {item.quantity > 1 && (
              <p className="hidden text-xs text-[var(--text-muted)] sm:block">
                {formatPrice(item.unitPrice)} each
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
