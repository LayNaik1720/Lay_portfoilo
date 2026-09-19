/**
 * CRUD for editorial content (categories, collections, testimonials, stories,
 * banners, FAQs) plus the public storefront content bundle.
 */
import slugify from 'slugify';
import { Category } from '../models/Category.js';
import { ProductCollection } from '../models/Collection.js';
import { Testimonial, Story, Banner, Faq } from '../models/Content.js';
import { Settings } from '../models/Settings.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Generic CRUD factory — every content type behaves the same way. */
function crudController(Model, { label, slugField = false, defaultSort = { displayOrder: 1, createdAt: -1 } } = {}) {
  return {
    list: asyncHandler(async (req, res) => {
      const filter = {};
      if (req.query.search) {
        filter.$or = ['name', 'title', 'question', 'quote']
          .map((f) => ({ [f]: new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }));
      }
      const items = await Model.find(filter).sort(defaultSort);
      res.json({ success: true, data: items });
    }),

    get: asyncHandler(async (req, res) => {
      const item = await Model.findById(req.params.id);
      if (!item) throw ApiError.notFound(`${label} not found`);
      res.json({ success: true, data: item });
    }),

    create: asyncHandler(async (req, res) => {
      const payload = { ...req.body };
      if (slugField && !payload.slug && (payload.name || payload.title)) {
        payload.slug = slugify(payload.name || payload.title, { lower: true, strict: true });
      }
      const item = await Model.create(payload);
      res.status(201).json({ success: true, data: item });
    }),

    update: asyncHandler(async (req, res) => {
      const item = await Model.findById(req.params.id);
      if (!item) throw ApiError.notFound(`${label} not found`);
      Object.assign(item, req.body);
      await item.save();
      res.json({ success: true, data: item });
    }),

    remove: asyncHandler(async (req, res) => {
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) throw ApiError.notFound(`${label} not found`);
      res.json({ success: true, message: `${label} deleted` });
    }),
  };
}

export const categoryCrud = crudController(Category, { label: 'Category', slugField: true });
export const collectionCrud = crudController(ProductCollection, { label: 'Collection', slugField: true });
export const testimonialCrud = crudController(Testimonial, { label: 'Testimonial' });
export const storyCrud = crudController(Story, { label: 'Story' });
export const bannerCrud = crudController(Banner, { label: 'Banner' });
export const faqCrud = crudController(Faq, { label: 'FAQ' });

// ---- public endpoints ------------------------------------------------------

export const listPublicCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.find({ isVisible: true }).sort({ displayOrder: 1, name: 1 });

  // Attach a live product count so empty categories can be hidden in the UI.
  const counts = await Product.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  res.json({
    success: true,
    data: categories.map((c) => ({ ...c.toObject(), productCount: countMap.get(String(c._id)) || 0 })),
  });
});

export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug, isVisible: true });
  if (!category) throw ApiError.notFound('Category not found');
  res.json({ success: true, data: category });
});

export const listPublicCollections = asyncHandler(async (_req, res) => {
  const items = await ProductCollection.find({ isActive: true }).sort({ displayOrder: 1 });
  res.json({ success: true, data: items });
});

export const listPublicTestimonials = asyncHandler(async (_req, res) => {
  const items = await Testimonial.find({ isPublished: true }).sort({ displayOrder: 1, createdAt: -1 });
  res.json({ success: true, data: items });
});

export const listPublicStories = asyncHandler(async (_req, res) => {
  const items = await Story.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });
  res.json({ success: true, data: items });
});

export const listPublicFaqs = asyncHandler(async (_req, res) => {
  const items = await Faq.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 });
  res.json({ success: true, data: items });
});

export const listPublicBanners = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.placement) filter.placement = req.query.placement;
  const items = await Banner.find(filter).sort({ displayOrder: 1 });
  res.json({ success: true, data: items });
});

/** Everything the storefront needs to render global chrome, in one request. */
export const getStorefrontConfig = asyncHandler(async (_req, res) => {
  const [settings, categories, collections] = await Promise.all([
    Settings.getSettings(),
    Category.find({ isVisible: true }).sort({ displayOrder: 1 }).select('name slug subtitle image featureSize'),
    ProductCollection.find({ isActive: true }).sort({ displayOrder: 1 }).select('name slug image'),
  ]);

  const s = settings.toObject();
  delete s._id;
  delete s.__v;

  res.json({ success: true, data: { settings: s, categories, collections } });
});

// ---- settings --------------------------------------------------------------

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await Settings.getSettings();
  res.json({ success: true, data: settings });
});

/** Deep-merge a partial settings payload into the singleton. */
export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSettings();

  const merge = (target, source) => {
    for (const [key, value] of Object.entries(source)) {
      if (key === '_id' || key === '__v' || key === 'key') continue;
      if (value && typeof value === 'object' && !Array.isArray(value) && target[key] && typeof target[key] === 'object') {
        merge(target[key], value);
      } else {
        target[key] = value;
      }
    }
  };

  merge(settings, req.body);
  settings.markModified('homepage');
  settings.markModified('shipping');
  settings.markModified('boutique');
  settings.markModified('contact');
  settings.markModified('popup');
  settings.markModified('recentPurchasePopup');
  settings.markModified('footer');
  settings.markModified('seo');
  settings.markModified('brand');
  await settings.save();

  res.json({ success: true, data: settings });
});
