import { Product } from '../models/Product.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { adjustStock } from '../services/inventoryService.js';

/** Flatten products into one row per stock-keeping unit (variant or product). */
export const listInventory = asyncHandler(async (req, res) => {
  const { search, status, page: p, limit: l } = req.query;
  const page = Math.max(1, Number(p) || 1);
  const limit = Math.min(100, Number(l) || 25);

  const filter = {};
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { 'variants.sku': rx }];
  }

  const products = await Product.find(filter).populate('category', 'name slug').sort({ name: 1 });

  const rows = [];
  for (const product of products) {
    if (product.variants.length) {
      for (const variant of product.variants) {
        rows.push({
          productId: product._id,
          productName: product.name,
          productSlug: product.slug,
          image: product.images?.[0]?.url || '',
          category: product.category,
          variantId: variant._id,
          sku: variant.sku,
          variantLabel: [variant.color, variant.size].filter(Boolean).join(' · ') || 'Default',
          stock: variant.stock,
          lowStockThreshold: product.lowStockThreshold,
          status: variant.stock <= 0 ? 'out_of_stock' : variant.stock <= product.lowStockThreshold ? 'low_stock' : 'in_stock',
        });
      }
    } else {
      rows.push({
        productId: product._id,
        productName: product.name,
        productSlug: product.slug,
        image: product.images?.[0]?.url || '',
        category: product.category,
        variantId: null,
        sku: product.sku,
        variantLabel: 'Default',
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        status: product.stock <= 0 ? 'out_of_stock' : product.stock <= product.lowStockThreshold ? 'low_stock' : 'in_stock',
      });
    }
  }

  const filtered = status ? rows.filter((r) => r.status === status) : rows;
  const paged = filtered.slice((page - 1) * limit, page * limit);

  res.json({
    success: true,
    data: paged,
    meta: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit) || 1,
      summary: {
        all: rows.length,
        in_stock: rows.filter((r) => r.status === 'in_stock').length,
        low_stock: rows.filter((r) => r.status === 'low_stock').length,
        out_of_stock: rows.filter((r) => r.status === 'out_of_stock').length,
      },
    },
  });
});

export const adjustInventory = asyncHandler(async (req, res) => {
  const { variantId = null, adjustment, reason = 'manual_adjustment', note = '' } = req.body;
  if (!Number.isFinite(Number(adjustment)) || Number(adjustment) === 0) {
    throw ApiError.badRequest('Adjustment must be a non-zero number');
  }

  const result = await adjustStock({
    productId: req.params.productId,
    variantId,
    delta: Number(adjustment),
    reason,
    note,
    performedBy: req.user.email,
  });

  res.json({
    success: true,
    data: {
      productId: result.product._id,
      previousStock: result.previousStock,
      newStock: result.newStock,
    },
  });
});

/** Set an absolute stock level (the delta is derived and logged). */
export const setInventory = asyncHandler(async (req, res) => {
  const { variantId = null, stock, note = '' } = req.body;
  const product = await Product.findById(req.params.productId);
  if (!product) throw ApiError.notFound('Product not found');

  const current = variantId ? product.variants.id(variantId)?.stock ?? 0 : product.stock;
  const delta = Number(stock) - current;
  if (delta === 0) return res.json({ success: true, data: { previousStock: current, newStock: current } });

  const result = await adjustStock({
    productId: product._id,
    variantId,
    delta,
    reason: 'correction',
    note: note || `Set to ${stock}`,
    performedBy: req.user.email,
  });

  return res.json({
    success: true,
    data: { previousStock: result.previousStock, newStock: result.newStock },
  });
});

export const inventoryHistory = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 30);

  const filter = {};
  if (req.query.productId) filter.product = req.query.productId;
  if (req.query.reason) filter.reason = req.query.reason;

  const [logs, total] = await Promise.all([
    InventoryLog.find(filter)
      .populate('product', 'name slug sku')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    InventoryLog.countDocuments(filter),
  ]);

  res.json({ success: true, data: logs, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
});
