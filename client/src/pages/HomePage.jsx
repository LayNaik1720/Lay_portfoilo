import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Hero } from '../components/home/Hero.jsx';
import { PromoBar } from '../components/home/PromoBar.jsx';
import { CollectionGrid } from '../components/home/CollectionGrid.jsx';
import {
  NewArrivals, BestSellers, BrandStory, FeaturedStories, Testimonials, VisitBoutique,
} from '../components/home/HomeSections.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { SectionHeading, Reveal, Modal } from '../components/ui/Primitives.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useStorefront } from '../context/StorefrontContext.jsx';
import { useSeo } from '../hooks/useSeo.js';

/** Sale rail — only renders when genuinely discounted stock exists. */
function SaleSection() {
  const { settings } = useStorefront();
  const { data, loading } = useFetch('/products?onSale=true&limit=4&sort=newest');
  if (loading || !data?.length) return null;

  const home = settings?.homepage || {};

  return (
    <section className="section bg-[var(--surface-muted)]">
      <div className="shell">
        <SectionHeading
          eyebrow="Limited"
          title={home.saleHeading}
          subtitle={home.saleSubtitle}
          action={(
            <Link to="/shop?onSale=true" className="inline-flex items-center gap-2 text-sm link-underline">
              Shop sale <ArrowRight size={14} />
            </Link>
          )}
          className="mb-10 md:mb-14"
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-6">
          {data.map((p, i) => (
            <Reveal key={p._id} delay={Math.min(i * 0.06, 0.3)}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { settings } = useStorefront();
  const [videoOpen, setVideoOpen] = useState(false);

  useSeo({
    title: null,
    description: settings?.seo?.defaultDescription,
    image: settings?.homepage?.hero?.image,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ClothingStore',
      name: settings?.brand?.name || 'AARAVA',
      description: settings?.seo?.defaultDescription,
      address: {
        '@type': 'PostalAddress',
        streetAddress: settings?.boutique?.addressLine1,
        addressLocality: 'Surat',
        addressRegion: 'Gujarat',
        addressCountry: 'IN',
      },
      telephone: settings?.contact?.phone,
      openingHours: settings?.boutique?.openingHours,
    },
  });

  return (
    <>
      <Hero onWatchVideo={() => setVideoOpen(true)} />
      <PromoBar />
      <CollectionGrid />
      <NewArrivals />
      <BestSellers />
      <BrandStory />
      <SaleSection />
      <FeaturedStories />
      <Testimonials />
      <VisitBoutique />

      <Modal open={videoOpen} onClose={() => setVideoOpen(false)} label="Brand film" maxWidth="max-w-3xl">
        <div className="p-8 text-center sm:p-12">
          <p className="eyebrow mb-4 text-[var(--accent)]">Coming soon</p>
          <h2 className="display-md mb-4">Our campaign film</h2>
          <p className="mx-auto max-w-md text-sm text-[var(--text-muted)]">
            The film for this season is still in edit. Add a video URL under
            Admin → Settings → Homepage and it will play here.
          </p>
          <Link to="/stories" onClick={() => setVideoOpen(false)} className="btn btn-primary mt-7">
            Watch our stories instead
          </Link>
        </div>
      </Modal>
    </>
  );
}
