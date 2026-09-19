import { useEffect } from 'react';

const DEFAULT_TITLE = 'AARAVA — Handcrafted Boutique Fashion';

function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Sets document title, meta description, canonical URL, Open Graph tags and
 * optional JSON-LD structured data for the current page.
 */
export function useSeo({ title, description, image, type = 'website', jsonLd, noIndex = false } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} · AARAVA` : DEFAULT_TITLE;
    document.title = fullTitle;

    if (description) {
      upsertMeta('meta[name="description"]', { name: 'description', content: description });
    }
    upsertMeta('meta[name="robots"]', { name: 'robots', content: noIndex ? 'noindex,nofollow' : 'index,follow' });

    const url = window.location.href.split('?')[0];
    upsertLink('canonical', url);

    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url });
    if (description) upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    if (image) {
      const absolute = image.startsWith('http') ? image : `${window.location.origin}${image}`;
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: absolute });
      upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: absolute });
    }
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle });

    let script = null;
    if (jsonLd) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => { if (script) script.remove(); };
  }, [title, description, image, type, noIndex, JSON.stringify(jsonLd)]);
}
