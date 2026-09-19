/**
 * Central registry of demo imagery.
 *
 * Every seeded record references these constants instead of hard-coding paths,
 * so replacing the demo photography with the boutique's real images is a
 * single-file change (or swap the files in client/public/images/).
 */

const BASE = '/images';

export const MEDIA = {
  hero: {
    desktop: `${BASE}/editorial/hero-desktop.jpg`,
    mobile: `${BASE}/editorial/hero-mobile.jpg`,
  },
  editorial: {
    story: `${BASE}/editorial/story.jpg`,
    boutique: `${BASE}/editorial/boutique.jpg`,
    about: `${BASE}/editorial/about.jpg`,
  },
  collections: {
    sarees: `${BASE}/collections/sarees.jpg`,
    lehengas: `${BASE}/collections/lehengas.jpg`,
    kurtis: `${BASE}/collections/kurtis.jpg`,
    indoWestern: `${BASE}/collections/indo-western.jpg`,
    dresses: `${BASE}/collections/dresses.jpg`,
    navratri: `${BASE}/collections/navratri.jpg`,
  },
  products: {
    saree: `${BASE}/products/saree-ruhi-1.jpg`,
    lehenga: `${BASE}/products/lehenga-noor-1.jpg`,
    kurti: `${BASE}/products/kurti-dhara-1.jpg`,
    indoWestern: `${BASE}/products/indowestern-zoya-1.jpg`,
    dress: `${BASE}/products/dress-aria-1.jpg`,
  },
  stories: {
    lookbook: `${BASE}/stories/lookbook.jpg`,
    behindTheScenes: `${BASE}/stories/behind-the-scenes.jpg`,
  },
};

/**
 * Product photography, grouped by the look each product belongs to.
 * The first entry becomes the primary image, so each look leads with its own
 * detail shot and falls back to the collection photograph for the second angle.
 */
export const PRODUCT_MEDIA = {
  saree: [MEDIA.products.saree, MEDIA.collections.sarees],
  lehenga: [MEDIA.products.lehenga, MEDIA.collections.lehengas],
  kurti: [MEDIA.products.kurti, MEDIA.collections.kurtis],
  indoWestern: [MEDIA.products.indoWestern, MEDIA.collections.indoWestern],
  dress: [MEDIA.products.dress, MEDIA.collections.dresses],
  navratri: [MEDIA.collections.navratri, MEDIA.products.lehenga],
};

/** Build the image array for a product from a look key. */
export function imagesFor(look, alt) {
  const urls = PRODUCT_MEDIA[look] || [MEDIA.collections.sarees];
  return urls.map((url, index) => ({ url, alt, isPrimary: index === 0 }));
}
