import { Link } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { ProductCard } from '../components/ProductCard.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useSeo } from '../hooks/useSeo.js';

const LINKS = [
  { to: '/shop', label: 'Shop all' },
  { to: '/stories', label: 'Stories' },
  { to: '/about', label: 'Our story' },
  { to: '/store', label: 'Visit the boutique' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
];

export default function NotFoundPage() {
  const { data } = useFetch('/products?bestSeller=true&limit=4');
  useSeo({ title: 'Page not found', noIndex: true });

  return (
    <div className="shell section">
      <div className="mx-auto max-w-xl text-center">
        <p className="font-[var(--font-display)] text-[clamp(5rem,18vw,10rem)] font-light leading-none text-[var(--border-strong)]">
          404
        </p>
        <h1 className="display-lg mt-2">This page slipped a stitch</h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)]">
          The page you were looking for has moved, sold out or never existed.
          Let’s get you back to something you can actually wear.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/shop" className="btn btn-primary">
            Shop the collection <ArrowRight size={14} />
          </Link>
          <Link to="/" className="btn btn-outline">Back to home</Link>
        </div>

        <nav aria-label="Helpful links" className="mt-10 border-t border-[var(--border)] pt-6">
          <p className="eyebrow-sm mb-4 text-[var(--text-muted)]">
            <Search size={12} className="mr-1.5 inline" aria-hidden="true" />
            Or try one of these
          </p>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2.5 text-sm">
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="link-underline text-[var(--text-muted)]">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {data?.length > 0 && (
        <section className="mt-20" aria-labelledby="popular-heading">
          <h2 id="popular-heading" className="display-md mb-8 text-center">Popular right now</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-6">
            {data.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
