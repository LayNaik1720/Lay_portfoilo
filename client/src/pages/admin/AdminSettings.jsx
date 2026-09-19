import { useEffect, useState } from 'react';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import {
  AdminPageHeader, FormField, Toggle, SaveButton,
} from '../../components/admin/AdminUI.jsx';
import { LoadingSkeleton, ErrorState } from '../../components/ui/Primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useStorefront } from '../../context/StorefrontContext.jsx';
import { api } from '../../lib/api.js';

const TABS = [
  { id: 'brand', label: 'Brand' },
  { id: 'shipping', label: 'Shipping & payments' },
  { id: 'contact', label: 'Contact & boutique' },
  { id: 'homepage', label: 'Homepage' },
  { id: 'popups', label: 'Popups' },
  { id: 'seo', label: 'SEO' },
];

const PROMO_ICONS = ['tag', 'truck', 'refresh', 'whatsapp', 'sparkle'];

export default function AdminSettings() {
  const { data, loading, error, refetch } = useFetch('/admin/settings');
  const { reload: reloadStorefront } = useStorefront();
  const toast = useToast();

  const [tab, setTab] = useState('brand');
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useSeo({ title: 'Settings', noIndex: true });

  useEffect(() => { if (data) setForm(structuredClone(data)); }, [data]);

  /** Update a nested path like ('homepage.hero.title', value). */
  const setPath = (path, value) => setForm((prev) => {
    const next = structuredClone(prev);
    const keys = path.split('.');
    let node = next;
    for (let i = 0; i < keys.length - 1; i += 1) {
      if (node[keys[i]] == null) node[keys[i]] = {};
      node = node[keys[i]];
    }
    node[keys[keys.length - 1]] = value;
    return next;
  });

  const bind = (path, { number = false } = {}) => ({
    value: path.split('.').reduce((o, k) => (o ?? {})[k], form) ?? '',
    onChange: (e) => setPath(path, number ? Number(e.target.value) : e.target.value),
  });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put('/admin/settings', form);
      toast.success('Settings saved — the storefront updates immediately.');
      await refetch();
      await reloadStorefront?.();
    } catch (err) {
      toast.error(err.message || 'Could not save settings.');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-10 w-48" />
        <LoadingSkeleton className="h-96 w-full" />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const promoBar = form.homepage?.promoBar || [];

  return (
    <form onSubmit={save}>
      <AdminPageHeader
        title="Settings"
        description="Everything here is live — no code changes needed."
        action={<SaveButton busy={busy}>Save settings</SaveButton>}
      />

      {/* ---- tabs */}
      <div className="mb-6 border-b border-[var(--border)]">
        <ul className="scroll-x gap-0" role="tablist" aria-label="Settings sections">
          {TABS.map((t) => (
            <li key={t.id} className="shrink-0">
              <button
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-colors ${
                  tab === t.id
                    ? 'border-[var(--primary)] font-medium text-[var(--text)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="max-w-3xl space-y-5">
        {/* ------------------------------------------------------------ brand */}
        {tab === 'brand' && (
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="display-sm mb-5">Brand</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Brand name" htmlFor="brand-name">
                <input id="brand-name" className="field" {...bind('brand.name')} />
              </FormField>
              <FormField label="Logo text" htmlFor="brand-logo" hint="Shown in the navbar and footer wordmark.">
                <input id="brand-logo" className="field" {...bind('brand.logoText')} />
              </FormField>
              <FormField label="Tagline" htmlFor="brand-tagline" className="sm:col-span-2">
                <input id="brand-tagline" className="field" {...bind('brand.tagline')} />
              </FormField>
              <FormField label="Footer blurb" htmlFor="footer-about" className="sm:col-span-2">
                <textarea id="footer-about" className="field" rows={3} {...bind('footer.about')} />
              </FormField>
              <FormField label="Footer wordmark" htmlFor="footer-wordmark" hint="The oversized type at the base of every page.">
                <input id="footer-wordmark" className="field" {...bind('footer.wordmark')} />
              </FormField>
            </div>
          </section>
        )}

        {/* --------------------------------------------------------- shipping */}
        {tab === 'shipping' && (
          <>
            <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="display-sm mb-5">Shipping</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Free shipping threshold (₹)" htmlFor="ship-threshold"
                  hint="Drives the cart progress bar and the promo strip."
                >
                  <input id="ship-threshold" type="number" min="0" className="field" {...bind('shipping.freeShippingThreshold', { number: true })} />
                </FormField>
                <FormField label="Shipping charge (₹)" htmlFor="ship-charge" hint="Applied below the threshold.">
                  <input id="ship-charge" type="number" min="0" className="field" {...bind('shipping.shippingCharge', { number: true })} />
                </FormField>
                <FormField label="Dispatch time (days)" htmlFor="ship-dispatch">
                  <input id="ship-dispatch" type="number" min="0" className="field" {...bind('shipping.dispatchDays', { number: true })} />
                </FormField>
                <FormField label="Return window (days)" htmlFor="ship-return">
                  <input id="ship-return" type="number" min="0" className="field" {...bind('shipping.returnWindowDays', { number: true })} />
                </FormField>
                <FormField label="Estimated delivery copy" htmlFor="ship-eta" className="sm:col-span-2">
                  <input id="ship-eta" className="field" {...bind('shipping.estimatedDeliveryDays')} />
                </FormField>
              </div>
            </section>

            <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="display-sm mb-5">Payments</h2>
              <div className="space-y-4">
                <Toggle
                  id="cod-enabled"
                  checked={form.shipping?.codEnabled !== false}
                  onChange={(v) => setPath('shipping.codEnabled', v)}
                  label="Accept cash on delivery"
                  hint="Turning this off removes COD from checkout."
                />
                <FormField label="COD handling fee (₹)" htmlFor="cod-fee" hint="Added to COD orders. 0 for none.">
                  <input id="cod-fee" type="number" min="0" className="field" {...bind('shipping.codExtraCharge', { number: true })} />
                </FormField>
              </div>
              <p className="mt-5 border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs text-[var(--text-muted)]">
                Gateway keys live in the server’s environment variables
                (<code className="text-[var(--text)]">PAYMENT_KEY_ID</code> /
                <code className="ml-1 text-[var(--text)]">PAYMENT_KEY_SECRET</code>),
                never in the browser. Signature verification happens server-side only.
              </p>
            </section>
          </>
        )}

        {/* ---------------------------------------------------------- contact */}
        {tab === 'contact' && (
          <>
            <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="display-sm mb-5">Contact</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Email" htmlFor="c-email">
                  <input id="c-email" type="email" className="field" {...bind('contact.email')} />
                </FormField>
                <FormField label="Phone" htmlFor="c-phone">
                  <input id="c-phone" className="field" {...bind('contact.phone')} />
                </FormField>
                <FormField
                  label="WhatsApp number" htmlFor="c-whatsapp"
                  hint="Digits only with country code, e.g. 919876543210."
                >
                  <input id="c-whatsapp" className="field" {...bind('contact.whatsapp')} />
                </FormField>
                <FormField label="Instagram URL" htmlFor="c-instagram">
                  <input id="c-instagram" className="field" {...bind('contact.instagram')} />
                </FormField>
                <FormField label="Facebook URL" htmlFor="c-facebook">
                  <input id="c-facebook" className="field" {...bind('contact.facebook')} />
                </FormField>
              </div>
            </section>

            <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="display-sm mb-5">Boutique</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Boutique name" htmlFor="b-name" className="sm:col-span-2">
                  <input id="b-name" className="field" {...bind('boutique.name')} />
                </FormField>
                <FormField label="Address line 1" htmlFor="b-addr1">
                  <input id="b-addr1" className="field" {...bind('boutique.addressLine1')} />
                </FormField>
                <FormField label="Address line 2" htmlFor="b-addr2">
                  <input id="b-addr2" className="field" {...bind('boutique.addressLine2')} />
                </FormField>
                <FormField label="Opening hours" htmlFor="b-hours">
                  <input id="b-hours" className="field" {...bind('boutique.openingHours')} />
                </FormField>
                <FormField label="Closed note" htmlFor="b-closed">
                  <input id="b-closed" className="field" {...bind('boutique.closedNote')} />
                </FormField>
                <FormField
                  label="Google Maps search query" htmlFor="b-map" className="sm:col-span-2"
                  hint="Used for the embedded map and the directions link."
                >
                  <input id="b-map" className="field" {...bind('boutique.mapQuery')} />
                </FormField>
                <FormField label="Latitude" htmlFor="b-lat">
                  <input id="b-lat" type="number" step="any" className="field" {...bind('boutique.latitude', { number: true })} />
                </FormField>
                <FormField label="Longitude" htmlFor="b-lng">
                  <input id="b-lng" type="number" step="any" className="field" {...bind('boutique.longitude', { number: true })} />
                </FormField>
                <FormField label="Boutique photo path" htmlFor="b-image" className="sm:col-span-2">
                  <input id="b-image" className="field" {...bind('boutique.image')} />
                </FormField>
              </div>
            </section>
          </>
        )}

        {/* --------------------------------------------------------- homepage */}
        {tab === 'homepage' && (
          <>
            <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="display-sm mb-5">Hero</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Eyebrow" htmlFor="h-eyebrow" className="sm:col-span-2">
                  <input id="h-eyebrow" className="field" {...bind('homepage.hero.eyebrow')} />
                </FormField>
                <FormField label="Heading" htmlFor="h-title" className="sm:col-span-2">
                  <input id="h-title" className="field" {...bind('homepage.hero.title')} />
                </FormField>
                <FormField label="Subheading" htmlFor="h-sub" className="sm:col-span-2">
                  <textarea id="h-sub" className="field" rows={2} {...bind('homepage.hero.subtitle')} />
                </FormField>
                <FormField label="Primary button label" htmlFor="h-plabel">
                  <input id="h-plabel" className="field" {...bind('homepage.hero.primaryLabel')} />
                </FormField>
                <FormField label="Primary button link" htmlFor="h-plink">
                  <input id="h-plink" className="field" {...bind('homepage.hero.primaryLink')} />
                </FormField>
                <FormField label="Secondary button label" htmlFor="h-slabel">
                  <input id="h-slabel" className="field" {...bind('homepage.hero.secondaryLabel')} />
                </FormField>
                <FormField label="Video URL" htmlFor="h-video" hint="Played by the Watch Video button.">
                  <input id="h-video" className="field" {...bind('homepage.hero.videoUrl')} />
                </FormField>
                <FormField label="Desktop image" htmlFor="h-image">
                  <input id="h-image" className="field" {...bind('homepage.hero.image')} />
                </FormField>
                <FormField label="Mobile image" htmlFor="h-mobile" hint="Portrait crop for phones.">
                  <input id="h-mobile" className="field" {...bind('homepage.hero.mobileImage')} />
                </FormField>
              </div>
            </section>

            <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="display-sm">Promo strip</h2>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setPath('homepage.promoBar', [...promoBar, { icon: 'tag', title: '', subtitle: '' }])}
                >
                  <Plus size={13} /> Add item
                </button>
              </div>

              <ul className="space-y-3">
                {promoBar.map((item, i) => (
                  <li key={i} className="grid gap-2.5 border border-[var(--border)] p-3 sm:grid-cols-[7rem_1fr_1fr_auto]">
                    <FormField label="Icon" htmlFor={`promo-icon-${i}`}>
                      <select
                        id={`promo-icon-${i}`} className="field field-sm" value={item.icon}
                        onChange={(e) => setPath(`homepage.promoBar.${i}.icon`, e.target.value)}
                      >
                        {PROMO_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Title" htmlFor={`promo-title-${i}`}>
                      <input
                        id={`promo-title-${i}`} className="field field-sm" value={item.title}
                        onChange={(e) => setPath(`homepage.promoBar.${i}.title`, e.target.value)}
                      />
                    </FormField>
                    <FormField label="Subtitle" htmlFor={`promo-sub-${i}`}>
                      <input
                        id={`promo-sub-${i}`} className="field field-sm" value={item.subtitle}
                        onChange={(e) => setPath(`homepage.promoBar.${i}.subtitle`, e.target.value)}
                      />
                    </FormField>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => setPath('homepage.promoBar', promoBar.filter((_, j) => j !== i))}
                        aria-label="Remove promo item"
                        className="icon-btn h-9 w-9 text-[var(--text-muted)] hover:text-[var(--error)]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="display-sm mb-5">Section headings</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['homepage.collectionsHeading', 'Collections heading'],
                  ['homepage.collectionsSubtitle', 'Collections subtitle'],
                  ['homepage.newArrivalsHeading', 'New arrivals heading'],
                  ['homepage.newArrivalsSubtitle', 'New arrivals subtitle'],
                  ['homepage.bestSellersHeading', 'Best sellers heading'],
                  ['homepage.bestSellersSubtitle', 'Best sellers subtitle'],
                  ['homepage.saleHeading', 'Sale heading'],
                  ['homepage.saleSubtitle', 'Sale subtitle'],
                  ['homepage.storiesHeading', 'Stories heading'],
                  ['homepage.storiesSubtitle', 'Stories subtitle'],
                  ['homepage.testimonialsHeading', 'Testimonials heading'],
                ].map(([path, label]) => (
                  <FormField key={path} label={label} htmlFor={path}>
                    <input id={path} className="field" {...bind(path)} />
                  </FormField>
                ))}
              </div>
            </section>

            <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="display-sm mb-5">Brand story block</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Eyebrow" htmlFor="story-heading">
                  <input id="story-heading" className="field" {...bind('homepage.storyHeading')} />
                </FormField>
                <FormField label="Title" htmlFor="story-title">
                  <input id="story-title" className="field" {...bind('homepage.storyTitle')} />
                </FormField>
                <FormField label="Body" htmlFor="story-body" className="sm:col-span-2">
                  <textarea id="story-body" className="field" rows={4} {...bind('homepage.storyBody')} />
                </FormField>
                <FormField label="Button label" htmlFor="story-cta">
                  <input id="story-cta" className="field" {...bind('homepage.storyCtaLabel')} />
                </FormField>
                <FormField label="Image path" htmlFor="story-image">
                  <input id="story-image" className="field" {...bind('homepage.storyImage')} />
                </FormField>
              </div>
            </section>
          </>
        )}

        {/* ----------------------------------------------------------- popups */}
        {tab === 'popups' && (
          <>
            <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="display-sm mb-2">Welcome popup</h2>
              <p className="mb-5 text-xs text-[var(--text-muted)]">
                Shown once per visitor; dismissal is remembered in their browser.
              </p>
              <div className="space-y-4">
                <Toggle
                  id="popup-enabled"
                  checked={form.popup?.enabled !== false}
                  onChange={(v) => setPath('popup.enabled', v)}
                  label="Show the welcome popup"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Heading" htmlFor="popup-heading">
                    <input id="popup-heading" className="field" {...bind('popup.heading')} />
                  </FormField>
                  <FormField label="Button label" htmlFor="popup-button">
                    <input id="popup-button" className="field" {...bind('popup.buttonLabel')} />
                  </FormField>
                  <FormField label="Body" htmlFor="popup-body" className="sm:col-span-2">
                    <textarea id="popup-body" className="field" rows={2} {...bind('popup.body')} />
                  </FormField>
                  <FormField
                    label="Coupon code" htmlFor="popup-coupon"
                    hint="Must match an active coupon to actually work."
                  >
                    <input id="popup-coupon" className="field uppercase" {...bind('popup.couponCode')} />
                  </FormField>
                  <FormField label="Delay (seconds)" htmlFor="popup-delay">
                    <input id="popup-delay" type="number" min="0" className="field" {...bind('popup.delaySeconds', { number: true })} />
                  </FormField>
                </div>
              </div>
            </section>

            <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="display-sm mb-2">Recent purchase notices</h2>
              <p className="mb-5 text-xs text-[var(--text-muted)]">
                Built from genuine recent orders only — first name and city, never full
                names, emails or addresses.
              </p>
              <div className="space-y-4">
                <Toggle
                  id="rpp-enabled"
                  checked={form.recentPurchasePopup?.enabled !== false}
                  onChange={(v) => setPath('recentPurchasePopup.enabled', v)}
                  label="Show recent purchase notices"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Interval (seconds)" htmlFor="rpp-interval">
                    <input id="rpp-interval" type="number" min="5" className="field" {...bind('recentPurchasePopup.intervalSeconds', { number: true })} />
                  </FormField>
                  <FormField label="Look back (days)" htmlFor="rpp-lookback" hint="Only orders this recent are shown.">
                    <input id="rpp-lookback" type="number" min="1" className="field" {...bind('recentPurchasePopup.lookbackDays', { number: true })} />
                  </FormField>
                </div>
              </div>
            </section>
          </>
        )}

        {/* -------------------------------------------------------------- SEO */}
        {tab === 'seo' && (
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="display-sm mb-5">Search engine defaults</h2>
            <div className="space-y-4">
              <FormField label="Default title" htmlFor="seo-title">
                <input id="seo-title" className="field" {...bind('seo.defaultTitle')} />
              </FormField>
              <FormField label="Default meta description" htmlFor="seo-desc" hint="Around 155 characters reads best in search results.">
                <textarea id="seo-desc" className="field" rows={3} {...bind('seo.defaultDescription')} />
              </FormField>
              <FormField label="Open Graph image" htmlFor="seo-og" hint="Used when a link is shared on social media.">
                <input id="seo-og" className="field" {...bind('seo.ogImage')} />
              </FormField>
            </div>
            <p className="mt-5 border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs text-[var(--text-muted)]">
              A sitemap is generated automatically at <code className="text-[var(--text)]">/sitemap.xml</code>{' '}
              and crawler rules at <code className="text-[var(--text)]">/robots.txt</code>.
            </p>
          </section>
        )}

        <div className="flex items-center gap-3 pb-4">
          <SaveButton busy={busy}>Save settings</SaveButton>
          <button
            type="button"
            onClick={() => { setForm(structuredClone(data)); toast.success('Unsaved changes discarded.'); }}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <RotateCcw size={12} aria-hidden="true" /> Discard changes
          </button>
        </div>
      </div>
    </form>
  );
}
