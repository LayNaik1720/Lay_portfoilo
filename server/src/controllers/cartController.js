import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildLines, summarise } from '../services/pricingService.js';
import { availableStock } from '../services/inventoryService.js';

async function loadCart(userId) {
  let cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    populate: { path: 'category', select: 'name slug' },
  });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
}

/** Shape a cart into the response the client renders. */
async function serialiseCart(cart, user) {
  // Drop lines whose product was deleted.
  const valid = cart.items.filter((i) => i.product);
  if (valid.length !== cart.items.length) {
    cart.items = valid;
    await cart.save();
  }

  const lines = buildLines(valid.map((i) => ({
    product: i.product,
    variantId: i.variantId,
    quantity: i.quantity,
  })));

  const totals = await summarise(lines, { couponCode: cart.couponCode, user });

  return {
    items: lines.map((line, index) => ({
      id: valid[index]._id,
      product: {
        id: line.product._id,
        name: line.product.name,
        slug: line.product.slug,
        sku: line.product.sku,
        image: line.product.images?.[0]?.url || '',
        price: line.product.price,
        originalPrice: line.product.originalPrice,
        category: line.product.category,
      },
      variantId: line.variantId,
      color: line.variant?.color || '',
      size: line.variant?.size || '',
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      availableStock: line.stock,
      inStock: line.inStock,
    })),
    totals,
    couponCode: cart.couponCode,
  };
}

export const getCart = asyncHandler(async (req, res) => {
  const cart = await loadCart(req.user._id);
  res.json({ success: true, data: await serialiseCart(cart, req.user) });
});

export const addToCart = asyncHandler(async (req, res) => {
  const { productId, variantId = null, quantity = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product || product.status !== 'active') throw ApiError.notFound('That product is not available');

  const stock = availableStock(product, variantId);
  if (stock <= 0) throw ApiError.conflict(`${product.name} is out of stock`);

  const cart = await Cart.findOne({ user: req.user._id }) || await Cart.create({ user: req.user._id, items: [] });
  const existing = cart.items.find((i) => String(i.product) === String(productId)
    && String(i.variantId || '') === String(variantId || ''));

  const nextQuantity = (existing?.quantity || 0) + quantity;
  if (nextQuantity > stock) {
    throw ApiError.conflict(`Only ${stock} available${existing ? ' — you already have some in your bag' : ''}`);
  }

  if (existing) existing.quantity = nextQuantity;
  else cart.items.push({ product: productId, variantId, quantity });

  await cart.save();
  const populated = await loadCart(req.user._id);
  res.status(201).json({ success: true, data: await serialiseCart(populated, req.user) });
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw ApiError.notFound('Cart not found');

  const item = cart.items.id(req.params.itemId);
  if (!item) throw ApiError.notFound('That item is not in your bag');

  if (quantity <= 0) {
    item.deleteOne();
  } else {
    const product = await Product.findById(item.product);
    if (!product) throw ApiError.notFound('Product not found');
    const stock = availableStock(product, item.variantId);
    if (quantity > stock) throw ApiError.conflict(`Only ${stock} available`);
    item.quantity = quantity;
  }

  await cart.save();
  const populated = await loadCart(req.user._id);
  res.json({ success: true, data: await serialiseCart(populated, req.user) });
});

export const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw ApiError.notFound('Cart not found');
  const item = cart.items.id(req.params.itemId);
  if (item) item.deleteOne();
  await cart.save();
  const populated = await loadCart(req.user._id);
  res.json({ success: true, data: await serialiseCart(populated, req.user) });
});

export const clearCart = asyncHandler(async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [], couponCode: '' } });
  const cart = await loadCart(req.user._id);
  res.json({ success: true, data: await serialiseCart(cart, req.user) });
});

export const applyCoupon = asyncHandler(async (req, res) => {
  const cart = await loadCart(req.user._id);
  cart.couponCode = String(req.body.code || '').toUpperCase().trim();
  await cart.save();

  const data = await serialiseCart(cart, req.user);
  if (data.totals.couponError) {
    // Do not persist a coupon that cannot be applied.
    cart.couponCode = '';
    await cart.save();
    throw ApiError.badRequest(data.totals.couponError);
  }
  res.json({ success: true, data });
});

export const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await loadCart(req.user._id);
  cart.couponCode = '';
  await cart.save();
  res.json({ success: true, data: await serialiseCart(cart, req.user) });
});

/**
 * Price a guest cart. The client sends its local cart and gets back
 * authoritative pricing without needing an account.
 */
export const quoteGuestCart = asyncHandler(async (req, res) => {
  const { items = [], couponCode = '' } = req.body;

  const resolved = [];
  for (const entry of items) {
    // eslint-disable-next-line no-await-in-loop
    const product = await Product.findById(entry.productId).populate('category', 'name slug');
    if (!product || product.status !== 'active') continue;
    resolved.push({ product, variantId: entry.variantId || null, quantity: Math.max(1, entry.quantity || 1) });
  }

  const lines = buildLines(resolved);
  const totals = await summarise(lines, { couponCode, user: null });

  res.json({
    success: true,
    data: {
      items: lines.map((line) => ({
        product: {
          id: line.product._id,
          name: line.product.name,
          slug: line.product.slug,
          sku: line.product.sku,
          image: line.product.images?.[0]?.url || '',
          price: line.product.price,
          originalPrice: line.product.originalPrice,
          category: line.product.category,
        },
        variantId: line.variantId,
        color: line.variant?.color || '',
        size: line.variant?.size || '',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        availableStock: line.stock,
        inStock: line.inStock,
      })),
      totals,
    },
  });
});
