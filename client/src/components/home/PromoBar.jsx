import { Tag, Truck, RefreshCcw, MessageCircle, Sparkles } from 'lucide-react';
import { useStorefront } from '../../context/StorefrontContext.jsx';

const ICONS = { tag: Tag, truck: Truck, refresh: RefreshCcw, whatsapp: MessageCircle, sparkle: Sparkles };

/**
 * Feature strip under the hero.
 * Scrolls horizontally on small screens and settles into four columns above md.
 */
export function PromoBar() {
  const { settings } = useStorefront();
  const items = settings?.homepage?.promoBar || [];
  if (!items.length) return null;

  return (
    <section aria-label="Boutique services" className="border-y border-[var(--border)] bg-[var(--surface-muted)]">
      <div className="shell">
        <ul className="scroll-x gap-0 md:grid md:grid-cols-4 md:overflow-visible">
          {items.map((item, i) => {
            const Icon = ICONS[item.icon] || Sparkles;
            return (
              <li
                key={item.title || i}
                className="flex min-w-[68vw] items-center gap-3.5 border-r border-[var(--border)] py-5 pr-6 last:border-r-0 sm:min-w-[45vw] md:min-w-0 md:justify-center md:px-4"
              >
                <Icon size={19} strokeWidth={1.4} className="shrink-0 text-[var(--accent)]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-medium leading-tight">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-tight text-[var(--text-muted)]">{item.subtitle}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
