/**
 * Cart state.
 *
 * Signed-in shoppers get a server-persisted cart; guests get a localStorage
 * cart that is priced by the server via /cart/quote so totals, stock and
 * coupons are always authoritative. On sign-in the guest cart is merged up.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

const CartContext = createContext(null);
const GUEST_KEY = 'aarava.cart';
const GUEST_COUPON_KEY = 'aarava.coupon';

const EMPTY_TOTALS = {
  subtotal: 0, discount: 0, shippingFee: 0, total: 0,
  couponCode: '', couponError: null,
  freeShippingThreshold: 1000, amountToFreeShipping: 1000, qualifiesForFreeShipping: false,
};

function readGuestCart() {
  try { return JSON.parse(localStorage.getItem(GUEST_KEY)) || []; } catch { return []; }
}
function writeGuestCart(items) {
  try { localStorage.setItem(GUEST_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}
function readGuestCoupon() {
  try { return localStorage.getItem(GUEST_COUPON_KEY) || ''; } catch { return ''; }
}
function writeGuestCoupon(code) {
  try {
    if (code) localStorage.setItem(GUEST_COUPON_KEY, code);
    else localStorage.removeItem(GUEST_COUPON_KEY);
  } catch { /* ignore */ }
}

export function CartProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mergedRef = useRef(false);

  const applyPayload = useCallback((data) => {
    setItems(data.items || []);
    setTotals(data.totals || EMPTY_TOTALS);
  }, []);

  /** Re-price the guest cart on the server. */
  const quoteGuest = useCallback(async () => {
    const raw = readGuestCart();
    if (raw.length === 0) {
      setItems([]);
      setTotals({ ...EMPTY_TOTALS });
      return;
    }
    const res = await api.post('/cart/quote', { items: raw, couponCode: readGuestCoupon() });
    applyPayload(res.data);
  }, [applyPayload]);

  const refresh = useCallback(async () => {
    try {
      if (isAuthenticated) {
        const res = await api.get('/cart');
        applyPayload(res.data);
      } else {
        await quoteGuest();
      }
    } catch {
      // Leave the last known good state rather than blanking the cart.
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, applyPayload, quoteGuest]);

  // Merge the guest cart into the account exactly once after signing in.
  useEffect(() => {
    if (authLoading) return;

    async function sync() {
      if (isAuthenticated && !mergedRef.current) {
        mergedRef.current = true;
        const guestItems = readGuestCart();
        if (guestItems.length) {
          for (const item of guestItems) {
            try {
              // eslint-disable-next-line no-await-in-loop
              await api.post('/cart/items', item);
            } catch { /* skip items that are no longer purchasable */ }
          }
          writeGuestCart([]);
          writeGuestCoupon('');
          toast.info('Your bag was saved to your account.');
        }
      }
      if (!isAuthenticated) mergedRef.current = false;
      await refresh();
    }
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  const addItem = useCallback(async ({ productId, variantId = null, quantity = 1 }) => {
    setBusy(true);
    try {
      if (isAuthenticated) {
        const res = await api.post('/cart/items', { productId, variantId, quantity });
        applyPayload(res.data);
      } else {
        const raw = readGuestCart();
        const existing = raw.find((i) => i.productId === productId && (i.variantId || null) === (variantId || null));
        const next = existing
          ? raw.map((i) => (i === existing ? { ...i, quantity: i.quantity + quantity } : i))
          : [...raw, { productId, variantId, quantity }];
        writeGuestCart(next);
        await quoteGuest();
      }
      return true;
    } finally {
      setBusy(false);
    }
  }, [isAuthenticated, applyPayload, quoteGuest]);

  const updateQuantity = useCallback(async (item, quantity) => {
    setBusy(true);
    try {
      if (isAuthenticated) {
        const res = await api.patch(`/cart/items/${item.id}`, { quantity });
        applyPayload(res.data);
      } else {
        const raw = readGuestCart();
        const next = quantity <= 0
          ? raw.filter((i) => !(i.productId === item.product.id && (i.variantId || null) === (item.variantId || null)))
          : raw.map((i) => (i.productId === item.product.id && (i.variantId || null) === (item.variantId || null)
            ? { ...i, quantity } : i));
        writeGuestCart(next);
        await quoteGuest();
      }
    } finally {
      setBusy(false);
    }
  }, [isAuthenticated, applyPayload, quoteGuest]);

  const removeItem = useCallback(async (item) => {
    setBusy(true);
    try {
      if (isAuthenticated) {
        const res = await api.delete(`/cart/items/${item.id}`);
        applyPayload(res.data);
      } else {
        const raw = readGuestCart().filter(
          (i) => !(i.productId === item.product.id && (i.variantId || null) === (item.variantId || null)),
        );
        writeGuestCart(raw);
        await quoteGuest();
      }
    } finally {
      setBusy(false);
    }
  }, [isAuthenticated, applyPayload, quoteGuest]);

  const clear = useCallback(async () => {
    if (isAuthenticated) {
      const res = await api.delete('/cart');
      applyPayload(res.data);
    } else {
      writeGuestCart([]);
      writeGuestCoupon('');
      setItems([]);
      setTotals({ ...EMPTY_TOTALS });
    }
  }, [isAuthenticated, applyPayload]);

  const applyCoupon = useCallback(async (code) => {
    if (isAuthenticated) {
      const res = await api.post('/cart/coupon', { code });
      applyPayload(res.data);
    } else {
      // Validate before storing so an invalid code surfaces immediately.
      const res = await api.post('/cart/quote', { items: readGuestCart(), couponCode: code });
      if (res.data.totals.couponError) {
        const err = new Error(res.data.totals.couponError);
        err.status = 400;
        throw err;
      }
      writeGuestCoupon(code);
      applyPayload(res.data);
    }
  }, [isAuthenticated, applyPayload]);

  const removeCoupon = useCallback(async () => {
    if (isAuthenticated) {
      const res = await api.delete('/cart/coupon');
      applyPayload(res.data);
    } else {
      writeGuestCoupon('');
      await quoteGuest();
    }
  }, [isAuthenticated, applyPayload, quoteGuest]);

  const count = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const value = useMemo(() => ({
    items, totals, count, loading, busy,
    drawerOpen, openDrawer: () => setDrawerOpen(true), closeDrawer: () => setDrawerOpen(false),
    addItem, updateQuantity, removeItem, clear, applyCoupon, removeCoupon, refresh,
    guestItems: readGuestCart,
  }), [items, totals, count, loading, busy, drawerOpen,
    addItem, updateQuantity, removeItem, clear, applyCoupon, removeCoupon, refresh]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
