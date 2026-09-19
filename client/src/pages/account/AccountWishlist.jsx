import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { AccountSection } from './AccountLayout.jsx';
import { ProductCard } from '../../components/ProductCard.jsx';
import { EmptyState, ProductGridSkeleton } from '../../components/ui/Primitives.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';
import { useSeo } from '../../hooks/useSeo.js';

export default function AccountWishlist() {
  const { products, count, loading } = useWishlist();
  useSeo({ title: 'Wishlist', noIndex: true });

  return (
    <AccountSection
      title="Wishlist"
      description={count ? `${count} piece${count === 1 ? '' : 's'} saved for later.` : 'Pieces you’ve saved for later.'}
    >
      {loading ? (
        <ProductGridSkeleton count={4} />
      ) : products?.length ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 md:gap-x-6">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          description="Tap the heart on any piece to keep it here while you decide."
          action={<Link to="/shop" className="btn btn-primary">Browse the collection</Link>}
        />
      )}
    </AccountSection>
  );
}
