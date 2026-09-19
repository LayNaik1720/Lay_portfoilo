/**
 * Generates sitemap.xml and robots.txt from live catalogue data.
 */
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { env } from '../config/env.js';

const STATIC_PATHS = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/shop', priority: '0.9', changefreq: 'daily' },
  { path: '/about', priority: '0.6', changefreq: 'monthly' },
  { path: '/stories', priority: '0.6', changefreq: 'weekly' },
  { path: '/contact', priority: '0.5', changefreq: 'monthly' },
  { path: '/store', priority: '0.5', changefreq: 'monthly' },
  { path: '/faq', priority: '0.5', changefreq: 'monthly' },
  { path: '/shipping-policy', priority: '0.3', changefreq: 'yearly' },
  { path: '/returns', priority: '0.3', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
];

const escapeXml = (s) => String(s).replace(/[<>&'"]/g, (c) => (
  { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
));

export async function buildSitemap() {
  const base = env.clientUrl.replace(/\/$/, '');
  const [products, categories] = await Promise.all([
    Product.find({ status: 'active' }).select('slug updatedAt').sort({ updatedAt: -1 }).limit(5000),
    Category.find({ isVisible: true }).select('slug updatedAt'),
  ]);

  const urls = [
    ...STATIC_PATHS.map((p) => ({ loc: `${base}${p.path}`, priority: p.priority, changefreq: p.changefreq })),
    ...categories.map((c) => ({
      loc: `${base}/category/${c.slug}`,
      lastmod: c.updatedAt?.toISOString(),
      priority: '0.8',
      changefreq: 'weekly',
    })),
    ...products.map((p) => ({
      loc: `${base}/product/${p.slug}`,
      lastmod: p.updatedAt?.toISOString(),
      priority: '0.7',
      changefreq: 'weekly',
    })),
  ];

  const body = urls.map((u) => [
    '  <url>',
    `    <loc>${escapeXml(u.loc)}</loc>`,
    u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : '',
    `    <changefreq>${u.changefreq}</changefreq>`,
    `    <priority>${u.priority}</priority>`,
    '  </url>',
  ].filter(Boolean).join('\n')).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function buildRobots() {
  const base = env.clientUrl.replace(/\/$/, '');
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /account',
    'Disallow: /checkout',
    'Disallow: /cart',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n');
}
