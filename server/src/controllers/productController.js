import mongoose from 'mongoose';
import slugify from 'slugify';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { ProductCollection } from '../models/Collection.js';
import { Review } from '../models/Review.js';
import { Order } from '../models/Order.js';
import { Settings } from '../models/Settings.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Translate query-string filters into a mongo filter document. */
async function buildFilter(query, { includeInactive = false } = {}) {
  const filter = {};
  if (!includeInactive) filter.status = 'active';
  else if (query.status) filter.status = query.status;

  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { tags: rx }, { shortDescription: rx }, { fabric: rx }];
  }

  if (query.category) {
    const slugs = String(query.category).split(',').map((s) => s.trim()).filter(Boolean);
    const categories = await Category.find({
      $or: [
        { slug: { $in: slugs } },
        ...(slugs.every(mongoose.isValidObjectId) ? [{ _id: { $in: slugs } }] : []),
      ],
    }).select('_id');
    filter.category = { $in: categories.map((c) => c._id) };
  }

  if (query.collection) {
    if (mongoose.isValidObjectId(query.collection)) {
      filter.collectionRef = query.collection;
    } else {
      // Allow clean slug URLs (?collection=aarambh-festive-2025) as well as ids.
      const slugs = String(query.collection).split(',').map((s) => s.trim()).filter(Boolean);
      const found = await ProductCollection.find({ slug: { $in: slugs } }).select('_id');
      filter.collectionRef = { $in: found.map((c) => c._id) };
    }
  }

  if (query.minPrice != null || query.maxPrice != null) {
    filter.price = {};
    if (query.minPrice != null) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice != null) filter.price.$lte = Number(query.maxPrice);
  }

  const listFilter = (value, field) => {
    if (!value) return;
    const values = String(value).split(',').map((s) => s.trim()).filter(Boolean);
    if (values.length) filter[field] = { $in: values };
  };
  listFilter(query.size, 'sizes');
  listFilter(query.color, 'colors');
  listFilter(query.fabric, 'fabric');
  listFilter(query.tag, 'tags');

  if (query.availability === 'in_stock') filter.stock = { $gt: 0 };
  if (query.availability === 'out_of_stock') filter.stock = { $lte: 0 };

  if (query.onSale === 'true' || query.sale === 'true') filter.isOnSale = true;
  if (query.newArrival === 'true') filter.isNewArrival = true;
  if (query.bestSeller === 'true') filter.isBestSeller = true;
  if (query.featured === 'true') filter.isFeatured = true;

  return filter;
}

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  popular: { viewCount: -1, ratingAverage: -1 },
  best_selling: { unitsSold: -1 },
  rating: { ratingAverage: -1 },
  name_asc: { name: 1 },
};

export const listProducts = asyncHandler(async (req, res) => {
  const query = req.validatedQuery || req.query;
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(60, Math.max(1, Number(query.limit) || 12));
  const filter = await buildFilter(query);

  // Discount filter needs a computed comparison, handled via $expr.
  if (query.minDiscount) {
    const pct = Number(query.minDiscount);
    filter.$expr = {
      $gte: [
        { $multiply: [{ $divide: [{ $subtract: [{ $ifNull: ['$originalPrice', '$price'] }, '$price'] },
          { $ifNull: ['$originalPrice', '$price'] }] }, 100] },
        pct,
      ],
    };
  }

  const sort = SORTS[query.sort] || SORTS.newest;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .populate('collectionRef', 'name slug')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  });
});

/** Distinct facet values so the UI can build filter controls from real data. */
export const getFilterOptions = asyncHandler(async (_req, res) => {
  const [sizes, colors, fabrics, categories, priceRange] = await Promise.all([
    Product.distinct('sizes', { status: 'active' }),
    Product.distinct('colors', { status: 'active' }),
    Product.distinct('fabric', { status: 'active' }),
    Category.find({ isVisible: true }).sort({ displayOrder: 1 }).select('name slug'),
    Product.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      sizes: sizes.filter(Boolean).sort(),
      colors: colors.filter(Boolean).sort(),
      fabrics: fabrics.filter(Boolean).sort(),
      categories,
      priceRange: { min: priceRange[0]?.min ?? 0, max: priceRange[0]?.max ?? 50000 },
    },
  });
});

export const searchSuggestions = asyncHandler(async (req, res) => {
  const term = String(req.query.q || '').trim();
  if (term.length < 2) return res.json({ success: true, data: { products: [], categories: [] } });

  const rx = new RegExp(escapeRegex(term), 'i');
  const [products, categories] = await Promise.all([
    Product.find({ status: 'active', $or: [{ name: rx }, { sku: rx }, { tags: rx }] })
      .select('name slug price originalPrice images sku')
      .limit(6),
    Category.find({ isVisible: true, name: rx }).select('name slug').limit(4),
  ]);

  return res.json({ success: true, data: { products, categories } });
});

/** Lookup by id — used to hydrate guest wishlists stored as ids. */
export const getProductById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid product id');
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product || product.status !== 'active') throw ApiError.notFound('Product not found');
  res.json({ success: true, data: product });
});

export const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug })
    .populate('category', 'name slug')
    .populate('collectionRef', 'name slug');

  if (!product || (product.status !== 'active' && req.user?.role !== 'admin')) {
    throw ApiError.notFound('We could not find that product');
  }

  await Product.updateOne({ _id: product._id }, { $inc: { viewCount: 1 } });

  const [reviews, related] = await Promise.all([
    Review.find({ product: product._id, status: 'approved' }).sort({ createdAt: -1 }).limit(20),
    Product.find({ _id: { $ne: product._id }, category: product.category, status: 'active' })
      .populate('category', 'name slug')
      .limit(4),
  ]);

  res.json({ success: true, data: { product, reviews, related } });
});

export const getBestSellers = asyncHandler(async (req, res) => {
  const limit = Math.min(20, Number(req.query.limit) || 8);

  // Prefer products with genuine sales recorded against real orders.
  const sold = await Order.aggregate([
    { $match: { status: { $nin: ['cancelled', 'returned', 'refunded'] } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', units: { $sum: '$items.quantity' } } },
    { $sort: { units: -1 } },
    { $limit: limit },
  ]);

  const ids = sold.map((s) => s._id);
  let products = [];
  if (ids.length) {
    const found = await Product.find({ _id: { $in: ids }, status: 'active' }).populate('category', 'name slug');
    const order = new Map(ids.map((id, i) => [String(id), i]));
    products = found.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)));
  }

  // Fall back to the admin-curated flag when there is not enough order history.
  if (products.length < limit) {
    const extra = await Product.find({
      status: 'active',
      isBestSeller: true,
      _id: { $nin: products.map((p) => p._id) },
    }).populate('category', 'name slug').limit(limit - products.length);
    products = [...products, ...extra];
  }

  res.json({ success: true, data: products });
});

export const getRecentPurchases = asyncHandler(async (req, res) => {
  const settings = await Settings.getSettings();
  if (!settings.recentPurchasePopup.enabled) {
    return res.json({ success: true, data: [] });
  }

  const since = new Date(Date.now() - settings.recentPurchasePopup.lookbackDays * 86400000);
  const orders = await Order.find({
    createdAt: { $gte: since },
    status: { $nin: ['cancelled', 'pending'] },
  }).sort({ createdAt: -1 })
    .limit(Math.min(24, Number(req.query.limit) || 12))
    .select('items createdAt shippingAddress.city');

  // Only non-identifying details are exposed.
  const data = orders.flatMap((order) => order.items.slice(0, 1).map((item) => ({
    productName: item.name,
    productSlug: item.slug,
    image: item.image,
    city: order.shippingAddress?.city || '',
    at: order.createdAt,
  })));

  return res.json({ success: true, data });
});

// ---- admin ----------------------------------------------------------------

export const adminListProducts = asyncHandler(async (req, res) => {
  const query = req.validatedQuery || req.query;
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Number(query.limit) || 20);
  const filter = await buildFilter(query, { includeInactive: true });

  const [items, total] = await Promise.all([
    Product.find(filter).populate('category', 'name slug').sort(SORTS[query.sort] || { createdAt: -1 })
      .skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
});

export const adminGetProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, data: product });
});

async function uniqueSlug(name, excludeId = null) {
  const base = slugify(name, { lower: true, strict: true });
  let slug = base;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

export const createProduct = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  payload.slug = payload.slug
    ? slugify(payload.slug, { lower: true, strict: true })
    : await uniqueSlug(payload.name);

  if (await Product.exists({ sku: payload.sku.toUpperCase() })) {
    throw ApiError.conflict('A product with that SKU already exists');
  }

  const product = await Product.create(payload);
  res.status(201).json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');

  const payload = { ...req.body };
  if (payload.name && !payload.slug && payload.name !== product.name) {
    payload.slug = await uniqueSlug(payload.name, product._id);
  }
  if (payload.sku && payload.sku.toUpperCase() !== product.sku) {
    if (await Product.exists({ sku: payload.sku.toUpperCase(), _id: { $ne: product._id } })) {
      throw ApiError.conflict('A product with that SKU already exists');
    }
  }

  Object.assign(product, payload);
  await product.save();
  res.json({ success: true, data: product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, message: 'Product deleted' });
});
