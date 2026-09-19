/**
 * Wishlist state — server-backed when signed in, localStorage for guests.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';

const WishlistContext = createContext(null);
const GUEST_KEY = 'aarava.wishlist';

function readGuest() {
  try { return JSON.parse(localStorage.getItem(GUEST_KEY)) || []; } catch { return []; }
}
function writeGuest(ids) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

export function WishlistProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [products, setProducts] = useState([]);
  const [ids, setIds] = useState(() => readGuest());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    if (isAuthenticated) {
      try {
        const res = await api.get('/wishlist');
        setProducts(res.data);
        setIds(res.data.map((p) => p._id || p.id));
      } catch { /* keep previous */ }
    } else {
      const guestIds = readGuest();
      setIds(guestIds);
      if (guestIds.length === 0) { setProducts([]); setLoading(false); return; }
      // Hydrate guest wishlist entries so availability reflects live stock.
      try {
        const results = await Promise.all(
          guestIds.map((id) => api.get(`/products/by-id/${id}`).catch(() => null)),
        );
        setProducts(results.filter(Boolean).map((r) => r.data));
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, [isAuthenticated]);

  // Merge guest wishlist into the account on sign-in.
  useEffect(() => {
    if (authLoading) return;
    async function sync() {
      if (isAuthenticated) {
        const guestIds = readGuest();
        if (guestIds.length) {
          for (const id of guestIds) {
            try { await api.post('/wishlist', { productId: id }); } catch { /* skip */ }
          }
          writeGuest([]);
        }
      }
      await refresh();
    }
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  const has = useCallback((productId) => ids.some((id) => String(id) === String(productId)), [ids]);

  const toggle = useCallback(async (productId) => {
    const isIn = has(productId);
    if (isAuthenticated) {
      if (isIn) await api.delete(`/wishlist/${productId}`);
      else await api.post('/wishlist', { productId });
      await refresh();
    } else {
      const next = isIn
        ? readGuest().filter((id) => String(id) !== String(productId))
        : [...readGuest(), productId];
      writeGuest(next);
      setIds(next);
      await refresh();
    }
    return !isIn;
  }, [has, isAuthenticated, refresh]);

  const remove = useCallback(async (productId) => {
    if (isAuthenticated) await api.delete(`/wishlist/${productId}`);
    else writeGuest(readGuest().filter((id) => String(id) !== String(productId)));
    await refresh();
  }, [isAuthenticated, refresh]);

  const value = useMemo(() => ({
    products, ids, count: ids.length, loading, has, toggle, remove, refresh,
  }), [products, ids, loading, has, toggle, remove, refresh]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
}
