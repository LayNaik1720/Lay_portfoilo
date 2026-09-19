import { Review } from '../models/Review.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Recalculate a product's rating aggregates from approved reviews. */
async function recalculateRating(productId) {
  const [stats] = await Review.aggregate([
    { $match: { product: productId, status: 'approved' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne({ _id: productId }, {
    $set: {
      ratingAverage: stats ? Math.round(stats.avg * 10) / 10 : 0,
      ratingCount: stats ? stats.count : 0,
    },
  });
}

export const listProductReviews = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug }).select('_id');
  if (!product) throw ApiError.notFound('Product not found');

  const reviews = await Review.find({ product: product._id, status: 'approved' }).sort({ createdAt: -1 });
  res.json({ success: true, data: reviews });
});

export const createReview = asyncHandler(async (req, res) => {
  const { productId, rating, comment, title = '', image = '' } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');

  const existing = await Review.findOne({ product: productId, user: req.user._id });
  if (existing) throw ApiError.conflict('You have already reviewed this piece');

  // A review is only badged "verified" when the customer actually received it.
  const purchase = await Order.findOne({
    $or: [{ user: req.user._id }, { 'customer.email': req.user.email }],
    'items.product': productId,
    status: { $in: ['delivered', 'shipped'] },
  });

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    order: purchase?._id || null,
    name: req.user.name,
    rating,
    title,
    comment,
    image,
    isVerifiedPurchase: Boolean(purchase),
    // Verified purchases publish immediately; others wait for moderation.
    status: purchase ? 'approved' : 'pending',
  });

  await recalculateRating(product._id);

  res.status(201).json({
    success: true,
    data: review,
    message: review.status === 'approved'
      ? 'Thank you — your review is live.'
      : 'Thank you — your review will appear once approved.',
  });
});

export const listMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ user: req.user._id })
    .populate('product', 'name slug images')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: reviews });
});

/** Products the customer has received but not yet reviewed. */
export const reviewableProducts = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    $or: [{ user: req.user._id }, { 'customer.email': req.user.email }],
    status: 'delivered',
  }).select('items');

  const productIds = [...new Set(orders.flatMap((o) => o.items.map((i) => String(i.product))))];
  const reviewed = await Review.find({ user: req.user._id }).select('product');
  const reviewedIds = new Set(reviewed.map((r) => String(r.product)));

  const pending = productIds.filter((id) => !reviewedIds.has(id));
  const products = await Product.find({ _id: { $in: pending } }).select('name slug images price');

  res.json({ success: true, data: products });
});

// ---- admin ----------------------------------------------------------------

export const adminListReviews = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const reviews = await Review.find(filter)
    .populate('product', 'name slug images')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: reviews });
});

export const adminModerateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');

  review.status = req.body.status;
  await review.save();
  await recalculateRating(review.product);

  res.json({ success: true, data: review });
});

export const adminDeleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw ApiError.notFound('Review not found');
  await recalculateRating(review.product);
  res.json({ success: true, message: 'Review deleted' });
});
