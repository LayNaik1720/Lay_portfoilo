import { Link } from 'react-router-dom';
import { Instagram, Facebook, MessageCircle, ArrowUpRight } from 'lucide-react';
import { useStorefront } from '../context/StorefrontContext.jsx';
import { whatsappLink } from '../lib/format.js';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'New Arrivals', to: '/shop?newArrival=true' },
      { label: 'Best Sellers', to: '/shop?bestSeller=true' },
      { label: 'Collections', to: '/shop' },
      { label: 'Sale', to: '/shop?onSale=true' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Our Story', to: '/about' },
      { label: 'Our Boutique', to: '/store' },
      { label: 'Journal', to: '/stories' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact', to: '/contact' },
      { label: 'Shipping', to: '/shipping-policy' },
      { label: 'Returns', to: '/returns' },
      { label: 'FAQ', to: '/faq' },
    ],
  },
];

export function Footer() {
  const { settings } = useStorefront();
  const brand = settings?.footer?.wordmark || settings?.brand?.name || 'AARAVA';
  const contact = settings?.contact || {};
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-[var(--primary)] text-[var(--text-inverse)]">
      <div className="shell pb-8 pt-16 md:pt-24">
        <div className="grid gap-12 md:grid-cols-12 md:gap-8">
          {/* brand blurb */}
          <div className="md:col-span-4 lg:col-span-5">
            <p className="font-[var(--font-display)] text-3xl font-light tracking-[0.25em]">{brand}</p>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/65">
              {settings?.footer?.about}
            </p>

            <div className="mt-7 flex items-center gap-3">
              {contact.instagram && (
                <a
                  href={contact.instagram}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Instagram"
                  className="grid h-10 w-10 place-items-center border border-white/25 transition hover:border-white/70"
                >
                  <Instagram size={16} strokeWidth={1.5} />
                </a>
              )}
              {contact.facebook && (
                <a
                  href={contact.facebook}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Facebook"
                  className="grid h-10 w-10 place-items-center border border-white/25 transition hover:border-white/70"
                >
                  <Facebook size={16} strokeWidth={1.5} />
                </a>
              )}
              {contact.whatsapp && (
                <a
                  href={whatsappLink(contact.whatsapp, 'Hello! I have a question about your collection.')}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="WhatsApp"
                  className="grid h-10 w-10 place-items-center border border-white/25 transition hover:border-white/70"
                >
                  <MessageCircle size={16} strokeWidth={1.5} />
                </a>
              )}
            </div>
          </div>

          {/* link columns */}
          {COLUMNS.map((col) => (
            <nav key={col.title} className="md:col-span-2 lg:col-span-2" aria-label={col.title}>
              <p className="eyebrow mb-5 text-white/45">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="link-underline text-sm text-white/80 hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* contact */}
          <div className="md:col-span-2 lg:col-span-1">
            <p className="eyebrow mb-5 text-white/45">Visit</p>
            <address className="space-y-1 text-sm not-italic text-white/70">
              <p>{settings?.boutique?.addressLine1}</p>
              <p>{settings?.boutique?.addressLine2}</p>
              {contact.phone && (
                <p className="pt-2">
                  <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="link-underline">{contact.phone}</a>
                </p>
              )}
              {contact.email && (
                <p>
                  <a href={`mailto:${contact.email}`} className="link-underline break-all">{contact.email}</a>
                </p>
              )}
            </address>
            <Link to="/store" className="mt-4 inline-flex items-center gap-1.5 text-sm text-white/80 link-underline">
              Get directions <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>

        {/* legal row */}
        <div className="mt-14 flex flex-col gap-4 border-t border-white/12 pt-7 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {settings?.brand?.name || 'Aarava'}. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li><Link to="/privacy" className="link-underline hover:text-white/80">Privacy</Link></li>
            <li><Link to="/terms" className="link-underline hover:text-white/80">Terms</Link></li>
            <li><Link to="/shipping-policy" className="link-underline hover:text-white/80">Shipping</Link></li>
            <li><Link to="/returns" className="link-underline hover:text-white/80">Returns</Link></li>
          </ul>
        </div>
      </div>

      {/* oversized wordmark */}
      <div className="overflow-hidden px-2 pb-3" aria-hidden="true">
        <p
          className="select-none text-center font-[var(--font-display)] font-light leading-[0.8] text-white/10"
          style={{ fontSize: 'clamp(3.5rem, 19vw, 20rem)', letterSpacing: '0.04em' }}
        >
          {brand}
        </p>
      </div>
    </footer>
  );
}
