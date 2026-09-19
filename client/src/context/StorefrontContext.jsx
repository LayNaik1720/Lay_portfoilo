/**
 * Global storefront configuration (settings, categories, collections) loaded
 * once and shared. Everything here is admin-editable.
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../lib/api.js';

const StorefrontContext = createContext(null);

const FALLBACK = {
  settings: {
    brand: { name: 'AARAVA', logoText: 'AARAVA', tagline: '' },
    shipping: { freeShippingThreshold: 1000, shippingCharge: 79, codEnabled: true, estimatedDeliveryDays: '4–7 business days' },
    contact: { email: '', phone: '', whatsapp: '', instagram: '', facebook: '' },
    boutique: {},
    homepage: { hero: {}, promoBar: [] },
    popup: { enabled: false },
    recentPurchasePopup: { enabled: false },
    footer: { about: '', wordmark: 'AARAVA' },
    seo: { defaultTitle: 'AARAVA', defaultDescription: '' },
  },
  categories: [],
  collections: [],
};

export function StorefrontProvider({ children }) {
  const [config, setConfig] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/storefront/config');
      setConfig({
        settings: { ...FALLBACK.settings, ...res.data.settings },
        categories: res.data.categories || [],
        collections: res.data.collections || [],
      });
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const value = useMemo(() => ({
    ...config,
    settings: config.settings,
    loading,
    error,
    reload: load,
  }), [config, loading, error, load]);

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  const ctx = useContext(StorefrontContext);
  if (!ctx) throw new Error('useStorefront must be used inside StorefrontProvider');
  return ctx;
}
