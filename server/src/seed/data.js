/**
 * Demo boutique catalogue.
 *
 * Everything here is fictional sample content used to make the storefront
 * visually complete during development. Every seeded document is flagged
 * `isDemo: true` so it can be distinguished from (and purged before) real
 * production data.
 */
import { MEDIA, imagesFor } from './media.js';

export const categories = [
  {
    name: 'Sarees',
    slug: 'sarees',
    subtitle: 'Handwoven silk & cotton',
    description: 'Six yards, woven slowly. Our sarees are sourced from weaving families we have worked with for over a decade.',
    image: MEDIA.collections.sarees,
    displayOrder: 1,
    featureSize: 'large',
    subcategories: ['Silk', 'Cotton', 'Linen', 'Banarasi'],
  },
  {
    name: 'Lehengas',
    slug: 'lehengas',
    subtitle: 'Occasion & bridal',
    description: 'Hand-embroidered lehengas for weddings, receptions and the celebrations in between.',
    image: MEDIA.collections.lehengas,
    displayOrder: 2,
    featureSize: 'tall',
    subcategories: ['Bridal', 'Reception', 'Festive'],
  },
  {
    name: 'Kurtis',
    slug: 'kurtis',
    subtitle: 'Everyday ease',
    description: 'Block-printed and hand-finished kurtis in breathable cotton and chanderi.',
    image: MEDIA.collections.kurtis,
    displayOrder: 3,
    featureSize: 'regular',
    subcategories: ['Cotton', 'Chanderi', 'Printed'],
  },
  {
    name: 'Indo-Western',
    slug: 'indo-western',
    subtitle: 'Where two worlds meet',
    description: 'Contemporary silhouettes cut from traditional textiles.',
    image: MEDIA.collections.indoWestern,
    displayOrder: 4,
    featureSize: 'wide',
    subcategories: ['Drapes', 'Co-ords', 'Jackets'],
  },
  {
    name: 'Dresses',
    slug: 'dresses',
    subtitle: 'Soft tailoring',
    description: 'Easy, elegant dresses in handwoven cotton and silk blends.',
    image: MEDIA.collections.dresses,
    displayOrder: 5,
    featureSize: 'regular',
    subcategories: ['Midi', 'Maxi', 'Wrap'],
  },
  {
    name: 'Navratri',
    slug: 'navratri',
    subtitle: 'Nine nights of colour',
    description: 'Mirror work, movement and the season of dancing.',
    image: MEDIA.collections.navratri,
    displayOrder: 6,
    featureSize: 'tall',
    subcategories: ['Chaniya Choli', 'Festive'],
  },
];

export const collections = [
  { name: 'Aarambh — Festive 2025', slug: 'aarambh-festive-2025', season: 'Festive 2025', description: 'The opening edit of the festive season.', image: MEDIA.collections.navratri, displayOrder: 1 },
  { name: 'Reet — Heritage Weaves', slug: 'reet-heritage-weaves', season: 'Core', description: 'Archive weaves revived with our master weavers.', image: MEDIA.collections.sarees, displayOrder: 2 },
  { name: 'Suno — Everyday Edit', slug: 'suno-everyday-edit', season: 'Core', description: 'Pieces made to be worn, washed and worn again.', image: MEDIA.collections.kurtis, displayOrder: 3 },
];

/**
 * 18 demo products across every category, with variants, realistic Indian
 * pricing, and a genuine mix of in-stock / low-stock / sold-out states.
 */
export const products = [
  {
    name: 'Ruhi Handwoven Silk Saree',
    sku: 'AAR-SAR-001', categorySlug: 'sarees', collectionSlug: 'reet-heritage-weaves', look: 'saree',
    price: 12900, originalPrice: 16500,
    shortDescription: 'A deep forest green mulberry silk saree with a hand-woven antique gold zari border.',
    description: 'Woven on a pit loom over eleven days, the Ruhi saree pairs a deep forest green body with an antique gold zari border drawn from an archive motif. The silk has a soft, fluid fall that drapes close to the body. Finished with a hand-rolled edge and a matching unstitched blouse piece.',
    fabric: 'Mulberry Silk', material: '100% pure mulberry silk with real zari',
    careInstructions: 'Dry clean only. Store folded in muslin, away from direct sunlight. Refold along different lines every few months.',
    tags: ['silk', 'festive', 'wedding', 'handwoven', 'zari'],
    isNewArrival: true, isFeatured: true, isBestSeller: true,
    lowStockThreshold: 3,
    variants: [
      { sku: 'AAR-SAR-001-GRN', color: 'Forest Green', colorHex: '#1F3D2F', size: 'Free Size', stock: 8 },
      { sku: 'AAR-SAR-001-TER', color: 'Terracotta', colorHex: '#B05A3C', size: 'Free Size', stock: 5 },
      { sku: 'AAR-SAR-001-IVR', color: 'Ivory', colorHex: '#F2EADF', size: 'Free Size', stock: 2 },
    ],
  },
  {
    name: 'Meher Banarasi Silk Saree',
    sku: 'AAR-SAR-002', categorySlug: 'sarees', collectionSlug: 'reet-heritage-weaves', look: 'saree',
    price: 18500, originalPrice: null,
    shortDescription: 'Classic Banarasi weave in warm ivory with a rich terracotta and gold pallu.',
    description: 'From the looms of Varanasi, the Meher saree carries a traditional jangla pattern across an ivory ground, opening into a dense terracotta and gold pallu. Each saree takes close to three weeks on the loom.',
    fabric: 'Banarasi Silk', material: 'Katan silk with zari brocade',
    careInstructions: 'Dry clean only. Never hang a Banarasi — always store flat and folded.',
    tags: ['banarasi', 'silk', 'bridal', 'heritage'],
    isFeatured: true, isBestSeller: true,
    variants: [
      { sku: 'AAR-SAR-002-IVR', color: 'Ivory', colorHex: '#F2EADF', size: 'Free Size', stock: 4 },
      { sku: 'AAR-SAR-002-ROS', color: 'Muted Rose', colorHex: '#C08B84', size: 'Free Size', stock: 3 },
    ],
  },
  {
    name: 'Anaya Linen Saree',
    sku: 'AAR-SAR-003', categorySlug: 'sarees', collectionSlug: 'suno-everyday-edit', look: 'saree',
    price: 4900, originalPrice: 6200,
    shortDescription: 'A breathable handspun linen saree in sand, made for long warm days.',
    description: 'Lightweight handspun linen in a warm sand tone with a fine taupe stripe. Softens beautifully with every wash. Our most-worn everyday saree.',
    fabric: 'Linen', material: '100% handspun linen',
    careInstructions: 'Gentle machine wash cold, line dry in shade. Warm iron.',
    tags: ['linen', 'everyday', 'summer', 'handspun'],
    isNewArrival: true,
    variants: [
      { sku: 'AAR-SAR-003-SND', color: 'Sand', colorHex: '#D9C7AE', size: 'Free Size', stock: 12 },
      { sku: 'AAR-SAR-003-TAU', color: 'Muted Taupe', colorHex: '#A99781', size: 'Free Size', stock: 9 },
    ],
  },
  {
    name: 'Ira Cotton Jamdani Saree',
    sku: 'AAR-SAR-004', categorySlug: 'sarees', look: 'saree',
    price: 6800, originalPrice: null,
    shortDescription: 'Fine cotton jamdani with a discontinuous supplementary weft motif.',
    description: 'Jamdani is among the most labour-intensive weaves in the subcontinent — each motif is worked into the cloth by hand as it is woven. Cool, feather-light, and quietly extraordinary.',
    fabric: 'Cotton', material: 'Handwoven cotton jamdani',
    careInstructions: 'Hand wash separately in cold water. Do not wring. Dry in shade.',
    tags: ['jamdani', 'cotton', 'handwoven', 'everyday'],
    variants: [
      { sku: 'AAR-SAR-004-IVR', color: 'Ivory', colorHex: '#F2EADF', size: 'Free Size', stock: 6 },
      { sku: 'AAR-SAR-004-GRN', color: 'Sage', colorHex: '#8A9A83', size: 'Free Size', stock: 0 },
    ],
  },
  {
    name: 'Kesar Bridal Lehenga',
    sku: 'AAR-LEH-001', categorySlug: 'lehengas', collectionSlug: 'aarambh-festive-2025', look: 'lehenga',
    price: 68000, originalPrice: 82000,
    shortDescription: 'Hand-embroidered bridal lehenga in deep emerald with antique gold zardozi.',
    description: 'Four hundred hours of zardozi embroidery across a deep emerald raw silk base. The kalidar skirt falls in sixteen panels for fullness without weight. Includes a hand-embroidered blouse and a tulle dupatta with scalloped edging.',
    fabric: 'Raw Silk', material: 'Raw silk with zardozi, dabka and sequin hand embroidery',
    careInstructions: 'Dry clean by a specialist only. Store flat in a breathable garment bag.',
    tags: ['bridal', 'wedding', 'zardozi', 'embroidered', 'luxury'],
    isFeatured: true,
    lowStockThreshold: 2,
    variants: [
      { sku: 'AAR-LEH-001-EMR', color: 'Emerald', colorHex: '#1F4A38', size: 'S', stock: 1 },
      { sku: 'AAR-LEH-001-EMR-M', color: 'Emerald', colorHex: '#1F4A38', size: 'M', stock: 2 },
      { sku: 'AAR-LEH-001-EMR-L', color: 'Emerald', colorHex: '#1F4A38', size: 'L', stock: 1 },
    ],
  },
  {
    name: 'Noor Reception Lehenga',
    sku: 'AAR-LEH-002', categorySlug: 'lehengas', collectionSlug: 'aarambh-festive-2025', look: 'lehenga',
    price: 42000, originalPrice: 52000,
    shortDescription: 'A softer reception lehenga in muted rose with tonal thread work.',
    description: 'Cut from silk organza in a muted rose, with tonal resham thread work that catches light rather than shouting for it. Designed for the second evening, when you want to move.',
    fabric: 'Silk Organza', material: 'Silk organza with resham thread embroidery',
    careInstructions: 'Dry clean only. Steam lightly to release creases.',
    tags: ['reception', 'wedding', 'embroidered', 'festive'],
    isBestSeller: true,
    variants: [
      { sku: 'AAR-LEH-002-ROS-S', color: 'Muted Rose', colorHex: '#C08B84', size: 'S', stock: 3 },
      { sku: 'AAR-LEH-002-ROS-M', color: 'Muted Rose', colorHex: '#C08B84', size: 'M', stock: 4 },
      { sku: 'AAR-LEH-002-ROS-L', color: 'Muted Rose', colorHex: '#C08B84', size: 'L', stock: 2 },
    ],
  },
  {
    name: 'Saanjh Festive Lehenga',
    sku: 'AAR-LEH-003', categorySlug: 'lehengas', look: 'lehenga',
    price: 24500, originalPrice: null,
    shortDescription: 'A lighter festive lehenga in terracotta chanderi with mirror detailing.',
    description: 'Chanderi in a warm terracotta with fine mirror work along the hem. Light enough for a full evening of dancing.',
    fabric: 'Chanderi', material: 'Chanderi silk-cotton with mirror work',
    careInstructions: 'Dry clean recommended. Iron on low heat with a cloth barrier.',
    tags: ['festive', 'navratri', 'mirror-work'],
    isNewArrival: true,
    variants: [
      { sku: 'AAR-LEH-003-TER-S', color: 'Terracotta', colorHex: '#B05A3C', size: 'S', stock: 5 },
      { sku: 'AAR-LEH-003-TER-M', color: 'Terracotta', colorHex: '#B05A3C', size: 'M', stock: 6 },
      { sku: 'AAR-LEH-003-TER-L', color: 'Terracotta', colorHex: '#B05A3C', size: 'L', stock: 3 },
    ],
  },
  {
    name: 'Bela Chanderi Kurti',
    sku: 'AAR-KUR-001', categorySlug: 'kurtis', collectionSlug: 'suno-everyday-edit', look: 'kurti',
    price: 3200, originalPrice: 4200,
    shortDescription: 'An ivory chanderi kurti with hand block-printed sprigs.',
    description: 'Chanderi has the rare quality of being both crisp and translucent. Block-printed by hand in small runs, so slight variation between pieces is expected and intended.',
    fabric: 'Chanderi', material: 'Chanderi silk-cotton, natural dyes',
    careInstructions: 'Hand wash cold with mild detergent. Dry in shade. Iron on medium.',
    tags: ['block-print', 'everyday', 'chanderi', 'cotton'],
    isNewArrival: true, isBestSeller: true,
    variants: [
      { sku: 'AAR-KUR-001-IVR-S', color: 'Ivory', colorHex: '#F2EADF', size: 'S', stock: 10 },
      { sku: 'AAR-KUR-001-IVR-M', color: 'Ivory', colorHex: '#F2EADF', size: 'M', stock: 14 },
      { sku: 'AAR-KUR-001-IVR-L', color: 'Ivory', colorHex: '#F2EADF', size: 'L', stock: 8 },
      { sku: 'AAR-KUR-001-IVR-XL', color: 'Ivory', colorHex: '#F2EADF', size: 'XL', stock: 4 },
    ],
  },
  {
    name: 'Tara Cotton Kurti',
    sku: 'AAR-KUR-002', categorySlug: 'kurtis', collectionSlug: 'suno-everyday-edit', look: 'kurti',
    price: 2400, originalPrice: null,
    shortDescription: 'A straight-cut cotton kurti in warm sand with a mandarin collar.',
    description: 'The plainest thing we make, and the one that comes back most often. Handloom cotton, side slits, deep pockets.',
    fabric: 'Cotton', material: '100% handloom cotton',
    careInstructions: 'Machine wash cold. Tumble dry low. Warm iron.',
    tags: ['cotton', 'everyday', 'handloom', 'pockets'],
    variants: [
      { sku: 'AAR-KUR-002-SND-S', color: 'Sand', colorHex: '#D9C7AE', size: 'S', stock: 9 },
      { sku: 'AAR-KUR-002-SND-M', color: 'Sand', colorHex: '#D9C7AE', size: 'M', stock: 11 },
      { sku: 'AAR-KUR-002-GRN-M', color: 'Sage', colorHex: '#8A9A83', size: 'M', stock: 7 },
      { sku: 'AAR-KUR-002-GRN-L', color: 'Sage', colorHex: '#8A9A83', size: 'L', stock: 5 },
    ],
  },
  {
    name: 'Nisha Printed Kurti Set',
    sku: 'AAR-KUR-003', categorySlug: 'kurtis', look: 'kurti',
    price: 4600, originalPrice: 5800,
    shortDescription: 'A three-piece set — kurti, palazzo and dupatta — in muted rose.',
    description: 'A complete set in soft cotton-silk, hand block-printed in a small geometric repeat. The palazzo is fully elasticated at the back for comfort.',
    fabric: 'Cotton Silk', material: 'Cotton-silk blend, hand block print',
    careInstructions: 'Hand wash cold, separately for the first three washes.',
    tags: ['set', 'block-print', 'everyday', 'festive'],
    variants: [
      { sku: 'AAR-KUR-003-ROS-S', color: 'Muted Rose', colorHex: '#C08B84', size: 'S', stock: 6 },
      { sku: 'AAR-KUR-003-ROS-M', color: 'Muted Rose', colorHex: '#C08B84', size: 'M', stock: 8 },
      { sku: 'AAR-KUR-003-ROS-L', color: 'Muted Rose', colorHex: '#C08B84', size: 'L', stock: 2 },
    ],
  },
  {
    name: 'Zoya Draped Indo-Western Gown',
    sku: 'AAR-IND-001', categorySlug: 'indo-western', collectionSlug: 'aarambh-festive-2025', look: 'indoWestern',
    price: 15800, originalPrice: 19500,
    shortDescription: 'A pre-draped saree gown in muted taupe with a structured shoulder.',
    description: 'All the presence of a saree, none of the pinning. The Zoya gown is pre-draped on a concealed inner corset with a single structured shoulder and a sweeping pallu.',
    fabric: 'Crepe Silk', material: 'Crepe silk with satin lining',
    careInstructions: 'Dry clean only.',
    tags: ['indo-western', 'gown', 'party', 'draped'],
    isFeatured: true, isNewArrival: true,
    variants: [
      { sku: 'AAR-IND-001-TAU-S', color: 'Muted Taupe', colorHex: '#A99781', size: 'S', stock: 4 },
      { sku: 'AAR-IND-001-TAU-M', color: 'Muted Taupe', colorHex: '#A99781', size: 'M', stock: 5 },
      { sku: 'AAR-IND-001-BLK-M', color: 'Charcoal', colorHex: '#2E2C28', size: 'M', stock: 3 },
    ],
  },
  {
    name: 'Amara Co-ord Set',
    sku: 'AAR-IND-002', categorySlug: 'indo-western', look: 'indoWestern',
    price: 8900, originalPrice: null,
    shortDescription: 'A relaxed jacket and trouser co-ord in handwoven khadi.',
    description: 'An unlined khadi jacket over a wide-leg trouser, both cut generously. Wear it as a set or break it up — it does both well.',
    fabric: 'Khadi', material: 'Handspun, handwoven khadi cotton',
    careInstructions: 'Machine wash gentle. Expect natural shrinkage of 2–3% on first wash.',
    tags: ['co-ord', 'khadi', 'indo-western', 'workwear'],
    variants: [
      { sku: 'AAR-IND-002-IVR-S', color: 'Ivory', colorHex: '#F2EADF', size: 'S', stock: 5 },
      { sku: 'AAR-IND-002-IVR-M', color: 'Ivory', colorHex: '#F2EADF', size: 'M', stock: 7 },
      { sku: 'AAR-IND-002-TAU-L', color: 'Muted Taupe', colorHex: '#A99781', size: 'L', stock: 4 },
    ],
  },
  {
    name: 'Leela Wrap Dress',
    sku: 'AAR-DRS-001', categorySlug: 'dresses', collectionSlug: 'suno-everyday-edit', look: 'dress',
    price: 5400, originalPrice: 6900,
    shortDescription: 'A true wrap dress in soft cream handwoven cotton.',
    description: 'A proper wrap — no hidden buttons, no fake ties. Cut from a soft handwoven cotton that gets better with age.',
    fabric: 'Cotton', material: 'Handwoven cotton',
    careInstructions: 'Machine wash cold, line dry.',
    tags: ['dress', 'everyday', 'wrap', 'cotton'],
    isBestSeller: true,
    variants: [
      { sku: 'AAR-DRS-001-CRM-S', color: 'Soft Cream', colorHex: '#EFE6D8', size: 'S', stock: 8 },
      { sku: 'AAR-DRS-001-CRM-M', color: 'Soft Cream', colorHex: '#EFE6D8', size: 'M', stock: 10 },
      { sku: 'AAR-DRS-001-CRM-L', color: 'Soft Cream', colorHex: '#EFE6D8', size: 'L', stock: 6 },
      { sku: 'AAR-DRS-001-ROS-M', color: 'Muted Rose', colorHex: '#C08B84', size: 'M', stock: 3 },
    ],
  },
  {
    name: 'Mira Midi Dress',
    sku: 'AAR-DRS-002', categorySlug: 'dresses', look: 'dress',
    price: 6200, originalPrice: null,
    shortDescription: 'A bias-cut midi in silk-cotton with a covered placket.',
    description: 'Bias cutting is wasteful of fabric and difficult to sew, which is why so few people do it. It is also the only way to get this kind of fall.',
    fabric: 'Silk Cotton', material: 'Silk-cotton blend, bias cut',
    careInstructions: 'Dry clean recommended, or hand wash very gently.',
    tags: ['dress', 'midi', 'bias-cut', 'occasion'],
    isNewArrival: true,
    variants: [
      { sku: 'AAR-DRS-002-GRN-S', color: 'Forest Green', colorHex: '#1F3D2F', size: 'S', stock: 4 },
      { sku: 'AAR-DRS-002-GRN-M', color: 'Forest Green', colorHex: '#1F3D2F', size: 'M', stock: 6 },
      { sku: 'AAR-DRS-002-SND-M', color: 'Sand', colorHex: '#D9C7AE', size: 'M', stock: 0 },
    ],
  },
  {
    name: 'Garba Mirror Chaniya Choli',
    sku: 'AAR-NAV-001', categorySlug: 'navratri', collectionSlug: 'aarambh-festive-2025', look: 'navratri',
    price: 11500, originalPrice: 14900,
    shortDescription: 'A full-circle chaniya choli in terracotta with dense mirror work.',
    description: 'Built for nine nights of garba. A genuinely full-circle skirt — sixteen metres at the hem — with hand-set mirror work and a back-tie choli that actually stays put.',
    fabric: 'Cotton Silk', material: 'Cotton-silk with hand-set mirror and thread work',
    careInstructions: 'Dry clean only. Store with the skirt inverted to protect the mirror work.',
    tags: ['navratri', 'garba', 'festive', 'mirror-work'],
    isNewArrival: true, isBestSeller: true, isFeatured: true,
    variants: [
      { sku: 'AAR-NAV-001-TER-S', color: 'Terracotta', colorHex: '#B05A3C', size: 'S', stock: 7 },
      { sku: 'AAR-NAV-001-TER-M', color: 'Terracotta', colorHex: '#B05A3C', size: 'M', stock: 9 },
      { sku: 'AAR-NAV-001-GRN-M', color: 'Forest Green', colorHex: '#1F3D2F', size: 'M', stock: 6 },
      { sku: 'AAR-NAV-001-GRN-L', color: 'Forest Green', colorHex: '#1F3D2F', size: 'L', stock: 2 },
    ],
  },
  {
    name: 'Raas Navratri Set',
    sku: 'AAR-NAV-002', categorySlug: 'navratri', look: 'navratri',
    price: 8400, originalPrice: 10500,
    shortDescription: 'A lighter three-piece navratri set with tonal embroidery.',
    description: 'For those who would rather not carry sixteen metres of skirt. A slimmer panelled silhouette with tonal thread work and a light dupatta.',
    fabric: 'Cotton', material: 'Cotton with resham thread work',
    careInstructions: 'Hand wash cold. Dry in shade.',
    tags: ['navratri', 'garba', 'festive'],
    variants: [
      { sku: 'AAR-NAV-002-SND-S', color: 'Sand', colorHex: '#D9C7AE', size: 'S', stock: 8 },
      { sku: 'AAR-NAV-002-SND-M', color: 'Sand', colorHex: '#D9C7AE', size: 'M', stock: 5 },
      { sku: 'AAR-NAV-002-ROS-L', color: 'Muted Rose', colorHex: '#C08B84', size: 'L', stock: 1 },
    ],
  },
  {
    name: 'Kiran Organza Saree',
    sku: 'AAR-SAR-005', categorySlug: 'sarees', look: 'saree',
    price: 9600, originalPrice: 12000,
    shortDescription: 'A sheer organza saree in soft cream with a hand-painted border.',
    description: 'Silk organza with a border hand-painted in muted rose and gold. Light as air, with just enough body to hold a pleat.',
    fabric: 'Silk Organza', material: 'Silk organza, hand-painted border',
    careInstructions: 'Dry clean only. Store rolled rather than folded.',
    tags: ['organza', 'silk', 'festive', 'hand-painted'],
    variants: [
      { sku: 'AAR-SAR-005-CRM', color: 'Soft Cream', colorHex: '#EFE6D8', size: 'Free Size', stock: 5 },
      { sku: 'AAR-SAR-005-ROS', color: 'Muted Rose', colorHex: '#C08B84', size: 'Free Size', stock: 3 },
    ],
  },
  {
    name: 'Dhara Khadi Kurti',
    sku: 'AAR-KUR-004', categorySlug: 'kurtis', look: 'kurti',
    price: 2900, originalPrice: null,
    shortDescription: 'An unstructured khadi kurti in muted taupe.',
    description: 'Handspun, handwoven khadi with a slightly irregular surface — the mark of cloth made by a person rather than a machine.',
    fabric: 'Khadi', material: 'Handspun, handwoven khadi cotton',
    careInstructions: 'Machine wash gentle, cold. Line dry.',
    tags: ['khadi', 'everyday', 'handwoven'],
    variants: [
      { sku: 'AAR-KUR-004-TAU-S', color: 'Muted Taupe', colorHex: '#A99781', size: 'S', stock: 0 },
      { sku: 'AAR-KUR-004-TAU-M', color: 'Muted Taupe', colorHex: '#A99781', size: 'M', stock: 0 },
      { sku: 'AAR-KUR-004-TAU-L', color: 'Muted Taupe', colorHex: '#A99781', size: 'L', stock: 0 },
    ],
  },
].map((p) => ({ ...p, images: imagesFor(p.look, `${p.name} — AARAVA`) }));

export const testimonials = [
  {
    name: 'Ananya Deshpande', location: 'Mumbai', rating: 5,
    quote: 'I wore the Kesar lehenga for my wedding and three people asked whether it was vintage. That is the highest compliment I can think of. The fit was corrected twice without a word of complaint.',
    displayOrder: 1,
  },
  {
    name: 'Ritika Shah', location: 'Surat', rating: 5,
    quote: 'I have bought four kurtis over two years. They have all softened rather than worn out. I cannot say that about anything else in my wardrobe.',
    displayOrder: 2,
  },
  {
    name: 'Meenakshi Iyer', location: 'Bengaluru', rating: 5,
    quote: 'The Ruhi saree arrived folded in muslin with a handwritten note about the weaver. It is the only online purchase that has ever made me feel like I was buying from a person.',
    displayOrder: 3,
  },
  {
    name: 'Fatima Qureshi', location: 'Ahmedabad', rating: 4,
    quote: 'Beautiful work and honest descriptions — the colour was exactly as photographed. Delivery took a day longer than promised, which is my only note.',
    displayOrder: 4,
  },
];

export const stories = [
  { title: 'Eleven days on the loom', description: 'Following a single Ruhi saree from warp to finished cloth.', image: MEDIA.stories.behindTheScenes, kind: 'behind_the_scenes', displayOrder: 1 },
  { title: 'Festive 2025 — Aarambh', description: 'The opening film for our festive collection.', image: MEDIA.stories.lookbook, kind: 'lookbook', displayOrder: 2, videoUrl: '' },
  { title: 'Inside the Athwalines boutique', description: 'A walk through the flagship store.', image: MEDIA.editorial.boutique, kind: 'event', displayOrder: 3 },
  { title: 'How to drape a saree six ways', description: 'Our stylist on the drapes that actually work for everyday.', image: MEDIA.collections.sarees, kind: 'styling', displayOrder: 4 },
  { title: 'The colour of Navratri', description: 'Choosing the nine colours, and why we broke the rules this year.', image: MEDIA.collections.lehengas, kind: 'reel', displayOrder: 5 },
];

export const faqs = [
  { question: 'What is your return policy?', answer: 'Unworn pieces with tags intact can be returned within 7 days of delivery for a full refund or exchange. Made-to-measure, altered and bridal pieces are final sale. Raise a return from your account under My Orders, or message us on WhatsApp and we will arrange a pickup.', category: 'Returns', displayOrder: 1 },
  { question: 'How long does delivery take?', answer: 'Orders within India are dispatched within 2 business days and typically arrive in 4–7 business days. Bridal and made-to-measure pieces take 3–6 weeks depending on the embroidery. You will receive tracking details by email as soon as your parcel leaves the boutique.', category: 'Shipping', displayOrder: 2 },
  { question: 'Do you offer COD?', answer: 'Yes, cash on delivery is available across most Indian pincodes on orders up to ₹25,000. You can select it at checkout — if it is unavailable for your pincode it simply will not appear as an option.', category: 'Payment', displayOrder: 3 },
  { question: 'How can I track my order?', answer: 'Sign in and open My Orders to see a live tracker for each order, from placement through to delivery. If you checked out as a guest, use the order number in your confirmation email on the order lookup page.', category: 'Orders', displayOrder: 4 },
  { question: 'What sizes are available?', answer: 'Most ready-to-wear runs from S to XL, and sarees are free size. Every product page carries a detailed size guide with garment measurements in inches. If you are between sizes we generally recommend sizing up, or write to us and we will measure the actual piece for you.', category: 'Sizing', displayOrder: 5 },
  { question: 'How do I contact the boutique?', answer: 'WhatsApp is the fastest — tap the floating button on any page and you will reach a person, usually within the hour during business hours. You can also call the boutique or email hello@aarava.com.', category: 'General', displayOrder: 6 },
  { question: 'What payment methods are supported?', answer: 'We accept UPI, all major credit and debit cards, net banking, popular wallets, and cash on delivery. All online payments are processed through an encrypted gateway — we never see or store your card details.', category: 'Payment', displayOrder: 7 },
  { question: 'Do you ship internationally?', answer: 'Not yet through the website. We do send pieces overseas regularly on request — message us on WhatsApp with your address and we will quote shipping and duties before you commit.', category: 'Shipping', displayOrder: 8 },
];

export const coupons = [
  {
    code: 'WELCOME10', description: '10% off your first order', discountType: 'percentage', discountValue: 10,
    minOrderValue: 0, maxDiscount: 2000, eligibility: 'new_customers', perCustomerLimit: 1, isActive: true,
  },
  {
    code: 'FESTIVE15', description: '15% off festive edit orders above ₹5,000', discountType: 'percentage', discountValue: 15,
    minOrderValue: 5000, maxDiscount: 5000, eligibility: 'all', isActive: true,
  },
  {
    code: 'FLAT500', description: '₹500 off orders above ₹3,000', discountType: 'fixed', discountValue: 500,
    minOrderValue: 3000, maxDiscount: null, eligibility: 'all', isActive: true,
  },
  {
    code: 'LOYAL20', description: '20% for returning customers', discountType: 'percentage', discountValue: 20,
    minOrderValue: 8000, maxDiscount: 6000, eligibility: 'existing_customers', isActive: true,
  },
];

export const customers = [
  { name: 'Priya Mehta', email: 'priya@example.com', mobile: '9876543210' },
  { name: 'Ananya Deshpande', email: 'ananya@example.com', mobile: '9876543211' },
  { name: 'Ritika Shah', email: 'ritika@example.com', mobile: '9876543212' },
  { name: 'Meenakshi Iyer', email: 'meenakshi@example.com', mobile: '9876543213' },
];
