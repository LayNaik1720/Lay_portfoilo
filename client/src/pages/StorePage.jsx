import { MapPin, Clock, Phone, Mail, Car, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SmartImage, Reveal } from '../components/ui/Primitives.jsx';
import { useStorefront } from '../context/StorefrontContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { whatsappLink } from '../lib/format.js';

const SERVICES = [
  { Icon: Sparkles, title: 'Personal styling', body: 'Book an hour with a stylist who will pull pieces for your shape, colouring and occasion.' },
  { Icon: Clock, title: 'In-house alterations', body: 'Blouse fitting, hem and fall adjustments finished in two to three days by our tailor.' },
  { Icon: Car, title: 'Parking & access', body: 'Paid basement parking in the building; the boutique is on the ground floor and step-free.' },
];

export default function StorePage() {
  const { settings } = useStorefront();
  const boutique = settings?.boutique || {};
  const contact = settings?.contact || {};

  const query = encodeURIComponent(boutique.mapQuery || `${boutique.addressLine1} ${boutique.addressLine2}`);
  // Keyless embed — works without exposing a Maps API key in the browser.
  const embedSrc = `https://www.google.com/maps?q=${query}&output=embed`;

  useSeo({
    title: 'Visit our boutique',
    description: `${boutique.name} — ${boutique.addressLine1}, ${boutique.addressLine2}. ${boutique.openingHours}`,
    image: boutique.image,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ClothingStore',
      name: boutique.name,
      image: boutique.image,
      address: {
        '@type': 'PostalAddress',
        streetAddress: boutique.addressLine1,
        addressLocality: 'Surat',
        addressRegion: 'Gujarat',
        addressCountry: 'IN',
      },
      telephone: contact.phone,
      openingHours: boutique.openingHours,
    },
  });

  return (
    <>
      <header className="relative isolate flex min-h-[48svh] items-end overflow-hidden bg-[var(--primary-dark)] md:min-h-[58svh]">
        <SmartImage
          src={boutique.image}
          alt=""
          ratio="16/9"
          priority
          className="absolute inset-0 h-full w-full"
          imgClassName="h-full"
        />
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{ background: 'linear-gradient(to top, rgba(21,41,31,0.85), rgba(21,41,31,0.15))' }}
        />
        <div className="shell relative z-10 pb-12 pt-24 md:pb-16">
          <p className="eyebrow mb-4 text-white/60">Surat, Gujarat</p>
          <h1 className="display-hero max-w-2xl text-white">{boutique.name}</h1>
          <p className="mt-5 max-w-lg text-base text-white/75">
            Come feel the cloth. Every piece we sell online is on the rail here too.
          </p>
        </div>
      </header>

      <div className="shell section">
        <div className="grid gap-10 lg:grid-cols-[22rem_1fr] lg:gap-16">
          {/* ------------------------------------------------------ details */}
          <Reveal>
            <h2 className="display-lg mb-7">Plan your visit</h2>

            <dl className="space-y-6">
              <div className="flex gap-4">
                <MapPin size={18} strokeWidth={1.4} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                <div>
                  <dt className="eyebrow-sm mb-1 text-[var(--text-muted)]">Address</dt>
                  <dd className="text-sm leading-relaxed">
                    {boutique.addressLine1}<br />{boutique.addressLine2}
                  </dd>
                </div>
              </div>

              <div className="flex gap-4">
                <Clock size={18} strokeWidth={1.4} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                <div>
                  <dt className="eyebrow-sm mb-1 text-[var(--text-muted)]">Opening hours</dt>
                  <dd className="text-sm leading-relaxed">
                    {boutique.openingHours}<br />
                    <span className="text-[var(--text-muted)]">{boutique.closedNote}</span>
                  </dd>
                </div>
              </div>

              <div className="flex gap-4">
                <Phone size={18} strokeWidth={1.4} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                <div>
                  <dt className="eyebrow-sm mb-1 text-[var(--text-muted)]">Phone</dt>
                  <dd className="text-sm">
                    <a href={`tel:${(contact.phone || '').replace(/\s/g, '')}`} className="link-underline">{contact.phone}</a>
                  </dd>
                </div>
              </div>

              <div className="flex gap-4">
                <Mail size={18} strokeWidth={1.4} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                <div>
                  <dt className="eyebrow-sm mb-1 text-[var(--text-muted)]">Email</dt>
                  <dd className="text-sm">
                    <a href={`mailto:${contact.email}`} className="link-underline">{contact.email}</a>
                  </dd>
                </div>
              </div>
            </dl>

            <div className="mt-8 flex flex-col gap-3">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${query}`}
                target="_blank" rel="noreferrer noopener"
                className="btn btn-primary"
              >
                Get directions <ArrowRight size={14} />
              </a>
              {contact.whatsapp && (
                <a
                  href={whatsappLink(contact.whatsapp, 'Hello! I would like to book a styling appointment.')}
                  target="_blank" rel="noreferrer noopener"
                  className="btn btn-outline"
                >
                  Book an appointment
                </a>
              )}
            </div>
          </Reveal>

          {/* ---------------------------------------------------------- map */}
          <Reveal delay={0.1}>
            <div className="h-[22rem] w-full border border-[var(--border)] bg-[var(--surface-muted)] md:h-[30rem] lg:h-full lg:min-h-[32rem]">
              <iframe
                title={`Map showing ${boutique.name}`}
                src={embedSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full w-full border-0"
                allowFullScreen
              />
            </div>
          </Reveal>
        </div>
      </div>

      {/* -------------------------------------------------------- services */}
      <section className="section bg-[var(--surface-muted)]">
        <div className="shell">
          <h2 className="display-lg mb-10">In store</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {SERVICES.map(({ Icon, title, body }, i) => (
              <Reveal key={title} delay={Math.min(i * 0.08, 0.24)}>
                <article className="border-t border-[var(--border-strong)] pt-6">
                  <Icon size={20} strokeWidth={1.3} className="mb-4 text-[var(--accent)]" aria-hidden="true" />
                  <h3 className="display-sm mb-2.5">{title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">{body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section text-center">
        <div className="shell">
          <h2 className="display-lg mb-4">Can’t make it in?</h2>
          <p className="mx-auto mb-8 max-w-md text-sm text-[var(--text-muted)]">
            The full collection is online, and we ship across India.
          </p>
          <Link to="/shop" className="btn btn-primary">
            Shop the collection <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </>
  );
}
