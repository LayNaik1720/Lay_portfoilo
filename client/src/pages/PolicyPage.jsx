import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useStorefront } from '../context/StorefrontContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { formatPrice, whatsappLink } from '../lib/format.js';

/**
 * Policy copy is generated from live settings so an admin changing the
 * shipping threshold or return window updates these pages too.
 */
function buildPolicies(settings) {
  const s = settings?.shipping || {};
  const brand = settings?.brand?.name || 'AARAVA';
  const contact = settings?.contact || {};
  const threshold = formatPrice(s.freeShippingThreshold ?? 1000);
  const charge = formatPrice(s.shippingCharge ?? 79);
  const window = s.returnWindowDays ?? 7;
  const dispatch = s.dispatchDays ?? 2;
  const eta = s.estimatedDeliveryDays || '4–7 business days';

  return {
    shipping: {
      title: 'Shipping policy',
      intro: `How, when and where we send your order.`,
      sections: [
        {
          heading: 'Dispatch times',
          body: [
            `Orders are picked, quality-checked and dispatched within ${dispatch} business days. Pieces that need blouse stitching or alteration take 3–5 days extra, and we will tell you before you pay if that applies.`,
            `Orders placed on a Sunday or a public holiday are processed the next working day.`,
          ],
        },
        {
          heading: 'Delivery times & charges',
          body: [
            `Standard delivery across India takes ${eta} from dispatch.`,
            `Shipping is free on orders above ${threshold}. Below that, a flat ${charge} applies, shown at checkout before you pay.`,
            `We currently ship within India only. For international enquiries, message us and we will arrange a quote.`,
          ],
        },
        {
          heading: 'Tracking',
          body: [
            `Once your parcel leaves us you will receive a tracking number by email and SMS. You can also follow every stage — confirmed, packed, shipped, out for delivery, delivered — from your account under Orders.`,
          ],
        },
        {
          heading: 'Undelivered parcels',
          body: [
            `If three delivery attempts fail, the parcel returns to us. We will contact you to arrange redelivery; a second shipping charge may apply.`,
            `Please make sure your address and phone number are correct at checkout — this is the single most common cause of delays.`,
          ],
        },
      ],
    },

    returns: {
      title: 'Returns & exchanges',
      intro: 'We want you to keep it because you love it, not because you are stuck with it.',
      sections: [
        {
          heading: `The ${window}-day window`,
          body: [
            `You may request a return within ${window} days of delivery. Start it from your account under Orders, or message us and we will do it for you.`,
            `Items must be unworn and unwashed, with original tags attached and in their original packaging.`,
          ],
        },
        {
          heading: 'What we cannot take back',
          body: [
            `Custom-stitched and made-to-measure pieces, blouses that have been altered to your measurements, and anything marked final sale.`,
            `Items showing wear, perfume, makeup marks or damage that did not come from us.`,
          ],
        },
        {
          heading: 'Exchanges',
          body: [
            `Size exchanges are free within the return window, subject to stock. If the size you need has sold out, we will refund you in full.`,
          ],
        },
        {
          heading: 'Refunds',
          body: [
            `Once your return reaches us and passes inspection, refunds are issued to the original payment method within 5–7 business days. Cash-on-delivery orders are refunded by bank transfer.`,
            `Original shipping charges are refunded only if the return is due to our error — a wrong, damaged or defective item.`,
          ],
        },
        {
          heading: 'Damaged or wrong items',
          body: [
            `Tell us within 48 hours of delivery with photographs and we will arrange a free pickup and a full refund or replacement. No argument, no restocking fee.`,
          ],
        },
      ],
    },

    privacy: {
      title: 'Privacy policy',
      intro: `What ${brand} collects, why, and what we will never do with it.`,
      sections: [
        {
          heading: 'What we collect',
          body: [
            `Account and order details: your name, email, phone number and shipping address. Order history and wishlist if you have an account.`,
            `Technical data: basic device and browser information, and the pages you visit, so we can keep the site working.`,
            `We never see or store your full card number. Payments are handled by our payment gateway; we only receive a confirmation and a reference.`,
          ],
        },
        {
          heading: 'Why we collect it',
          body: [
            `To take payment, ship your order, handle returns and answer your questions. To send transactional email about orders you have placed.`,
            `Marketing email is opt-in only, and every message has a one-click unsubscribe.`,
          ],
        },
        {
          heading: 'Who we share it with',
          body: [
            `Only the parties needed to fulfil your order: our courier, our payment gateway and our email provider. Each receives the minimum required.`,
            `We do not sell, rent or trade your personal data. Ever.`,
          ],
        },
        {
          heading: 'Security',
          body: [
            `Passwords are hashed with bcrypt and are never stored or recoverable in plain text. Traffic is encrypted in transit. Access to customer data is limited to staff who need it to do their job.`,
          ],
        },
        {
          heading: 'Your rights',
          body: [
            `You can ask for a copy of your data, correct it, or ask us to delete your account entirely. Email ${contact.email || 'our team'} and we will action it within 30 days.`,
            `We keep order records for as long as tax law requires, even after account deletion.`,
          ],
        },
        {
          heading: 'Cookies',
          body: [
            `We use a small number of functional cookies and local storage entries to keep you signed in and remember your bag and wishlist between visits. No third-party advertising trackers.`,
          ],
        },
      ],
    },

    terms: {
      title: 'Terms of service',
      intro: `The ground rules for buying from ${brand}.`,
      sections: [
        {
          heading: 'Using this site',
          body: [
            `By placing an order you confirm you are at least 18 years old and that the details you give us are accurate.`,
            `You may not scrape, resell or reproduce our photography, product descriptions or designs without written permission.`,
          ],
        },
        {
          heading: 'Products & pricing',
          body: [
            `Our pieces are handmade. Slight variation in colour, weave and finish between items — and between a photograph and the cloth in your hand — is inherent to handloom work, not a defect.`,
            `All prices are in Indian Rupees and inclusive of applicable taxes. We may change prices at any time, but never after you have paid.`,
            `Where a discount is shown, the original price is a price the item was genuinely offered at.`,
          ],
        },
        {
          heading: 'Orders & stock',
          body: [
            `An order is an offer to buy. We confirm it once payment is verified and stock is reserved.`,
            `Stock is checked again at the moment your order is created. If something sells out in the seconds between adding it to your bag and paying, we will cancel that line and refund it in full.`,
            `We reserve the right to refuse or cancel an order where we suspect fraud, or where an item was listed at an obviously incorrect price.`,
          ],
        },
        {
          heading: 'Coupons',
          body: [
            `Discount codes are single-use per customer unless stated otherwise, cannot be combined, and may carry a minimum order value or expiry date shown at the time of use.`,
          ],
        },
        {
          heading: 'Liability',
          body: [
            `Our liability for any order is limited to the amount you paid for it. We are not liable for indirect losses.`,
            `Nothing here limits your statutory rights as a consumer under Indian law.`,
          ],
        },
        {
          heading: 'Governing law',
          body: [
            `These terms are governed by the laws of India, and the courts of Surat, Gujarat have exclusive jurisdiction.`,
          ],
        },
      ],
    },
  };
}

const RELATED = [
  { to: '/shipping-policy', label: 'Shipping policy', kind: 'shipping' },
  { to: '/returns', label: 'Returns & exchanges', kind: 'returns' },
  { to: '/privacy', label: 'Privacy policy', kind: 'privacy' },
  { to: '/terms', label: 'Terms of service', kind: 'terms' },
];

export default function PolicyPage({ kind = 'shipping' }) {
  const { settings } = useStorefront();
  const policies = buildPolicies(settings);
  const policy = policies[kind] || policies.shipping;
  const waNumber = settings?.contact?.whatsapp;

  useSeo({
    title: policy.title,
    description: policy.intro,
  });

  return (
    <>
      <header className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
        <div className="shell py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <li><Link to="/" className="link-underline">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-[var(--text)]">{policy.title}</li>
            </ol>
          </nav>
          <h1 className="display-xl">{policy.title}</h1>
          <p className="mt-3 max-w-xl text-sm text-[var(--text-muted)]">{policy.intro}</p>
        </div>
      </header>

      <div className="shell section">
        <div className="grid gap-12 lg:grid-cols-[1fr_16rem] lg:gap-16">
          <article className="min-w-0 max-w-2xl">
            {policy.sections.map((section, i) => (
              <section key={section.heading} className={i > 0 ? 'mt-10' : ''}>
                <h2 className="display-sm mb-3">{section.heading}</h2>
                <div className="space-y-3.5">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-relaxed text-[var(--text-muted)]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}

            <div className="mt-12 border-t border-[var(--border)] pt-6">
              <p className="text-xs text-[var(--text-muted)]">
                Questions about this policy? Write to{' '}
                <a href={`mailto:${settings?.contact?.email}`} className="link-underline text-[var(--text)]">
                  {settings?.contact?.email}
                </a>.
              </p>
            </div>
          </article>

          <aside className="lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:self-start">
            <nav aria-label="Other policies" className="border border-[var(--border)] p-6">
              <h2 className="eyebrow-sm mb-4 text-[var(--text-muted)]">Other policies</h2>
              <ul className="space-y-2.5 text-sm">
                {RELATED.filter((r) => r.kind !== kind).map((r) => (
                  <li key={r.to}><Link to={r.to} className="link-underline">{r.label}</Link></li>
                ))}
                <li><Link to="/faq" className="link-underline">FAQ</Link></li>
              </ul>
            </nav>

            {waNumber && (
              <a
                href={whatsappLink(waNumber, `Hello! I have a question about your ${policy.title.toLowerCase()}.`)}
                target="_blank" rel="noreferrer noopener"
                className="btn btn-outline mt-4 w-full"
              >
                <MessageCircle size={14} /> Ask a question
              </a>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
