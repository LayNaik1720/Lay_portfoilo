import { Wishlist } from '../models/Wishlist.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

async function loadWishlist(userId) {
  let list = await Wishlist.findOne({ user: userId }).populate({
    path: 'products',
    populate: { path: 'category', select: 'name slug' },
  });
  if (!list) list = await Wishlist.create({ user: userId, products: [] });
  return list;
}

export const getWishlist = asyncHandler(async (req, res) => {
  const list = await loadWishlist(req.user._id);
  // Stock/availability is read live so the wishlist always reflects reality.
  res.json({ success: true, data: list.products.filter(Boolean) });
});

export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');

  await Wishlist.updateOne(
    { user: req.user._id },
    { $addToSet: { products: productId } },
    { upsert: true },
  );

  const list = await loadWishlist(req.user._id);
  res.status(201).json({ success: true, data: list.products.filter(Boolean) });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  await Wishlist.updateOne({ user: req.user._id }, { $pull: { products: req.params.productId } });
  const list = await loadWishlist(req.user._id);
  res.json({ success: true, data: list.products.filter(Boolean) });
});
