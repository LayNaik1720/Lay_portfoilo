import { useState } from 'react';
import { Mail, Phone, MessageCircle, MapPin, Clock, Check, Instagram, Facebook } from 'lucide-react';
import { SmartImage, Reveal } from '../components/ui/Primitives.jsx';
import { useStorefront } from '../context/StorefrontContext.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { whatsappLink } from '../lib/format.js';

const TOPICS = ['An order', 'Sizing & fit', 'A custom piece', 'Wholesale', 'Something else'];

export default function ContactPage() {
  const { settings } = useStorefront();
  const contact = settings?.contact || {};
  const boutique = settings?.boutique || {};

  const [form, setForm] = useState({ name: '', email: '', topic: TOPICS[0], message: '' });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  useSeo({
    title: 'Contact',
    description: 'Questions about an order, sizing or a custom piece? Reach the Aarava team by WhatsApp, phone or email.',
  });

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  /**
   * There is no transactional email provider wired up in this build, so rather
   * than pretend to send, the form hands off to WhatsApp with the message
   * pre-filled — a real, working action.
   */
  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (form.message.trim().length < 10) next.message = 'Please add a little more detail.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const body = `Hello Aarava,\n\nTopic: ${form.topic}\nName: ${form.name}\nEmail: ${form.email}\n\n${form.message}`;
    if (contact.whatsapp) {
      window.open(whatsappLink(contact.whatsapp, body), '_blank', 'noopener');
    } else {
      window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(form.topic)}&body=${encodeURIComponent(body)}`;
    }
    setSent(true);
  };

  const channels = [
    contact.whatsapp && {
      Icon: MessageCircle,
      label: 'WhatsApp',
      value: 'Chat with us',
      href: whatsappLink(contact.whatsapp, 'Hello! I have a question.'),
      hint: 'Usually replies within an hour',
    },
    contact.phone && {
      Icon: Phone,
      label: 'Phone',
      value: contact.phone,
      href: `tel:${contact.phone.replace(/\s/g, '')}`,
      hint: boutique.openingHours,
    },
    contact.email && {
      Icon: Mail,
      label: 'Email',
      value: contact.email,
      href: `mailto:${contact.email}`,
      hint: 'We reply within one business day',
    },
  ].filter(Boolean);

  return (
    <>
      <header className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
        <div className="shell py-14 md:py-20">
          <p className="eyebrow mb-4 text-[var(--accent)]">Say hello</p>
          <h1 className="display-hero max-w-2xl">Talk to a real person</h1>
          <p className="mt-5 max-w-lg text-base text-[var(--text-muted)]">
            Our team of four answers every message. No ticket numbers, no scripts.
          </p>
        </div>
      </header>

      <div className="shell section">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          {/* ------------------------------------------------------ details */}
          <Reveal>
            <h2 className="display-lg mb-8">Ways to reach us</h2>

            <ul className="space-y-1">
              {channels.map(({ Icon, label, value, href, hint }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noreferrer noopener' : undefined}
                    className="group flex items-start gap-4 border-b border-[var(--border)] py-5 transition-colors hover:border-[var(--primary)]"
                  >
                    <Icon size={18} strokeWidth={1.4} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="eyebrow-sm block text-[var(--text-muted)]">{label}</span>
                      <span className="mt-1 block text-base">{value}</span>
                      {hint && <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{hint}</span>}
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <h3 className="eyebrow-sm mb-3 text-[var(--text-muted)]">Visit the boutique</h3>
              <div className="flex gap-4">
                <MapPin size={18} strokeWidth={1.4} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                <address className="text-sm not-italic leading-relaxed">
                  <strong className="font-medium">{boutique.name}</strong><br />
                  {boutique.addressLine1}<br />
                  {boutique.addressLine2}
                </address>
              </div>
              <div className="mt-4 flex gap-4">
                <Clock size={18} strokeWidth={1.4} className="mt-0.5 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                <p className="text-sm leading-relaxed">
                  {boutique.openingHours}<br />
                  <span className="text-[var(--text-muted)]">{boutique.closedNote}</span>
                </p>
              </div>
            </div>

            {(contact.instagram || contact.facebook) && (
              <div className="mt-10">
                <h3 className="eyebrow-sm mb-3 text-[var(--text-muted)]">Follow along</h3>
                <div className="flex gap-2">
                  {contact.instagram && (
                    <a
                      href={contact.instagram} target="_blank" rel="noreferrer noopener"
                      aria-label="Instagram"
                      className="icon-btn icon-btn-bordered"
                    >
                      <Instagram size={17} />
                    </a>
                  )}
                  {contact.facebook && (
                    <a
                      href={contact.facebook} target="_blank" rel="noreferrer noopener"
                      aria-label="Facebook"
                      className="icon-btn icon-btn-bordered"
                    >
                      <Facebook size={17} />
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="mt-10 image-zoom">
              <SmartImage src={boutique.image} alt={boutique.name} ratio="16/10" />
            </div>
          </Reveal>

          {/* --------------------------------------------------------- form */}
          <Reveal delay={0.1}>
            <div className="border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 lg:sticky lg:top-[calc(var(--header-height)+2rem)]">
              {sent ? (
                <div className="py-10 text-center">
                  <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--primary)]">
                    <Check size={24} className="text-[var(--text-inverse)]" aria-hidden="true" />
                  </span>
                  <h2 className="display-sm mb-3">Message ready</h2>
                  <p className="mx-auto max-w-sm text-sm text-[var(--text-muted)]">
                    We’ve opened {contact.whatsapp ? 'WhatsApp' : 'your email client'} with your
                    message prefilled. Hit send there and we’ll reply shortly.
                  </p>
                  <button type="button" onClick={() => setSent(false)} className="btn btn-outline mt-7">
                    Write another
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} noValidate>
                  <h2 className="display-sm mb-2">Send a message</h2>
                  <p className="mb-6 text-sm text-[var(--text-muted)]">
                    Fill this in and we’ll open WhatsApp with your note ready to send.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="field-label" htmlFor="c-name">Your name</label>
                      <input
                        id="c-name" className="field" required value={form.name} onChange={set('name')}
                        aria-invalid={errors.name ? 'true' : undefined} autoComplete="name"
                      />
                      {errors.name && <span className="field-error" role="alert">{errors.name}</span>}
                    </div>

                    <div>
                      <label className="field-label" htmlFor="c-email">Email</label>
                      <input
                        id="c-email" type="email" className="field" required value={form.email} onChange={set('email')}
                        aria-invalid={errors.email ? 'true' : undefined} autoComplete="email"
                      />
                      {errors.email && <span className="field-error" role="alert">{errors.email}</span>}
                    </div>

                    <div>
                      <label className="field-label" htmlFor="c-topic">What’s it about?</label>
                      <select id="c-topic" className="field" value={form.topic} onChange={set('topic')}>
                        {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="field-label" htmlFor="c-message">Message</label>
                      <textarea
                        id="c-message" className="field" rows={5} required maxLength={1200}
                        value={form.message} onChange={set('message')}
                        aria-invalid={errors.message ? 'true' : undefined}
                        placeholder="Tell us what you need…"
                      />
                      {errors.message && <span className="field-error" role="alert">{errors.message}</span>}
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary mt-6 w-full">
                    <MessageCircle size={14} /> Send message
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </>
  );
}
