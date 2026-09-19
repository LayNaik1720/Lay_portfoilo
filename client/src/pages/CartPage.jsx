import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import { CartLine } from '../components/CartLine.jsx';
import { OrderSummary } from '../components/OrderSummary.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { EmptyState, LoadingSkeleton } from '../components/ui/Primitives.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useSeo } from '../hooks/useSeo.js';

export default function CartPage() {
  const { items, totals, loading, busy } = useCart();
  const navigate = useNavigate();
  const { data: suggestions } = useFetch('/products?bestSeller=true&limit=4', {
    skip: loading || items.length > 0,
  });

  useSeo({ title: 'Your bag', noIndex: true });

  const hasBlockingIssue = items.some((i) => i.inStock === false);

  if (loading) {
    return (
      <div className="shell section">
        <LoadingSkeleton className="mb-8 h-10 w-48" />
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-6">
            {[0, 1, 2].map((i) => <LoadingSkeleton key={i} className="h-32 w-full" />)}
          </div>
          <LoadingSkeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="shell section">
        <h1 className="display-xl mb-10">Your bag</h1>
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="Nothing here yet. Explore the collection and find something you’ll keep for years."
          action={<Link to="/shop" className="btn btn-primary">Shop the collection</Link>}
        />

        {suggestions?.length > 0 && (
          <section className="mt-20" aria-labelledby="suggest-heading">
            <h2 id="suggest-heading" className="display-md mb-8">Popular right now</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-6">
              {suggestions.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="shell section">
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3 md:mb-12">
        <h1 className="display-xl">Your bag</h1>
        <p className="text-sm text-[var(--text-muted)]">
          {items.length} item{items.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
        <div className="min-w-0">
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {items.map((item) => (
              <CartLine key={`${item.product?.id}-${item.variantId || 'base'}`} item={item} />
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Link to="/shop" className="inline-flex items-center gap-2 text-sm link-underline">
              <ArrowLeft size={14} /> Continue shopping
            </Link>
          </div>
        </div>

        {/* Sticky on desktop so the CTA stays reachable while scrolling a long bag. */}
        <div className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          <OrderSummary
            totals={totals}
            note="Shipping and taxes calculated at checkout"
            action={(
              <>
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  disabled={busy || hasBlockingIssue}
                  onClick={() => navigate('/checkout')}
                >
                  <Lock size={13} /> Checkout <ArrowRight size={14} />
                </button>
                {hasBlockingIssue && (
                  <p className="field-error mt-2 text-center" role="alert">
                    Please remove sold-out items to continue.
                  </p>
                )}
              </>
            )}
          />
        </div>
      </div>
    </div>
  );
}
