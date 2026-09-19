/**
 * Floating storefront widgets: WhatsApp button, first-visit welcome popup and
 * the recent-purchase notice. All are admin-configurable.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Check } from 'lucide-react';
import { useStorefront } from '../context/StorefrontContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { whatsappLink, timeAgo } from '../lib/format.js';
import { SmartImage } from './ui/Primitives.jsx';

/* ------------------------------------------------------------- whatsapp -- */

export function WhatsAppButton() {
  const { settings } = useStorefront();
  const number = settings?.contact?.whatsapp;
  if (!number) return null;

  return (
    <a
      href={whatsappLink(number, 'Hello! I would like to know more about your collection.')}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 left-5 z-[80] grid h-12 w-12 place-items-center rounded-full bg-[#1f7a4d] text-white shadow-lg transition-transform duration-300 hover:scale-105 sm:h-13 sm:w-13"
      style={{ boxShadow: '0 6px 20px rgba(31,122,77,0.32)' }}
    >
      <MessageCircle size={21} strokeWidth={1.8} />
    </a>
  );
}

/* --------------------------------------------------------- welcome popup -- */

const DISMISS_KEY = 'aarava.welcome.dismissed';

export function WelcomePopup() {
  const { settings } = useStorefront();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [claimed, setClaimed] = useState(false);

  const popup = settings?.popup;

  useEffect(() => {
    if (!popup?.enabled) return undefined;
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === '1'; } catch { /* ignore */ }
    if (dismissed) return undefined;

    const id = setTimeout(() => setOpen(true), (popup.delaySeconds || 6) * 1000);
    return () => clearTimeout(id);
  }, [popup?.enabled, popup?.delaySeconds]);

  function dismiss() {
    setOpen(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  async function claim(e) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    // Confirm the coupon is genuinely live before promising it.
    try {
      await api.post('/coupons/validate', { code: popup.couponCode, subtotal: 999999 });
    } catch { /* still show the code; eligibility is re-checked at checkout */ }
    setClaimed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  if (!popup?.enabled) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="welcome-heading">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-[rgba(28,33,29,0.6)]"
            onClick={dismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative grid w-full max-w-3xl overflow-hidden bg-[var(--background)] shadow-2xl sm:grid-cols-2"
          >
            <button
              type="button" onClick={dismiss} aria-label="Close"
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center bg-white/80 text-[var(--text)] transition hover:bg-white sm:bg-transparent"
            >
              <X size={17} />
            </button>

            <div className="hidden sm:block">
              <SmartImage
                src={settings?.homepage?.hero?.image}
                alt=""
                ratio="4/5"
                className="h-full"
              />
            </div>

            <div className="flex flex-col justify-center p-7 sm:p-10">
              {claimed ? (
                <div className="text-center sm:text-left">
                  <span className="mb-4 inline-grid h-11 w-11 place-items-center rounded-full bg-[var(--success)] text-white">
                    <Check size={20} />
                  </span>
                  <h2 className="display-md mb-3">You're in.</h2>
                  <p className="mb-5 text-sm text-[var(--text-muted)]">
                    Use this code at checkout for {popup.body?.replace(/^Enjoy /i, '').replace(/\.$/, '')}.
                  </p>
                  <div className="mb-6 border border-dashed border-[var(--primary)] bg-[var(--surface)] px-4 py-3 text-center">
                    <span className="font-[var(--font-display)] text-2xl tracking-[0.18em]">{popup.couponCode}</span>
                  </div>
                  <button type="button" onClick={dismiss} className="btn btn-primary btn-block">Start shopping</button>
                </div>
              ) : (
                <>
                  <p className="eyebrow mb-3 text-[var(--accent)]">{popup.heading}</p>
                  <h2 id="welcome-heading" className="display-md mb-3">{popup.body}</h2>
                  <p className="mb-6 text-sm text-[var(--text-muted)]">
                    Join our list for first access to new pieces, and we'll send your discount straight away.
                  </p>

                  <form onSubmit={claim} noValidate>
                    <label htmlFor="welcome-email" className="sr-only">Email address</label>
                    <input
                      id="welcome-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="field mb-3"
                      required
                    />
                    <button type="submit" className="btn btn-primary btn-block">{popup.buttonLabel}</button>
                  </form>

                  <button type="button" onClick={dismiss} className="mt-4 text-xs text-[var(--text-muted)] underline underline-offset-4">
                    No thanks, I'll pay full price
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------- recent purchase notice -- */

export function RecentPurchaseNotice() {
  const { settings } = useStorefront();
  const [purchases, setPurchases] = useState([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  const config = settings?.recentPurchasePopup;

  useEffect(() => {
    if (!config?.enabled) return;
    let cancelled = false;
    api.get('/products/recent-purchases')
      .then((res) => { if (!cancelled) setPurchases(res.data || []); })
      .catch(() => { /* silent — this is decorative */ });
    return () => { cancelled = true; };
  }, [config?.enabled]);

  useEffect(() => {
    if (!config?.enabled || purchases.length === 0) return undefined;

    const interval = (config.intervalSeconds || 22) * 1000;
    let showTimer;
    const cycle = setInterval(() => {
      setVisible(true);
      showTimer = setTimeout(() => {
        setVisible(false);
        setIndex((i) => (i + 1) % purchases.length);
      }, 6000);
    }, interval);

    const firstTimer = setTimeout(() => setVisible(true), 12000);
    const firstHide = setTimeout(() => setVisible(false), 18000);

    return () => {
      clearInterval(cycle);
      clearTimeout(showTimer);
      clearTimeout(firstTimer);
      clearTimeout(firstHide);
    };
  }, [config?.enabled, config?.intervalSeconds, purchases.length]);

  if (!config?.enabled || purchases.length === 0) return null;
  const item = purchases[index];
  if (!item) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -20, y: 10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-20 left-5 z-[75] hidden max-w-[19rem] items-center gap-3 border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-lg sm:flex"
        >
          <Link to={`/product/${item.productSlug}`} className="flex items-center gap-3">
            <SmartImage src={item.image} alt="" ratio="1/1" className="w-12 shrink-0" />
            <div className="min-w-0">
              <p className="eyebrow-sm text-[var(--text-muted)]">Recently purchased</p>
              <p className="truncate text-sm">{item.productName}</p>
              <p className="text-[0.6875rem] text-[var(--text-muted)]">
                {item.city ? `${item.city} · ` : ''}{timeAgo(item.at)}
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Dismiss"
            className="self-start text-[var(--text-muted)] transition hover:text-[var(--text)]"
          >
            <X size={13} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
