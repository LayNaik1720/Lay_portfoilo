/**
 * Single source of truth for stock movements.
 * Every change is written to InventoryLog so history is auditable.
 */
import { Product } from '../models/Product.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { ApiError } from '../utils/ApiError.js';

/** Resolve the stock currently available for a product/variant pair. */
export function availableStock(product, variantId) {
  if (variantId) {
    const variant = product.variants.id(variantId);
    if (!variant) throw ApiError.badRequest(`Selected option is no longer available for ${product.name}`);
    if (variant.isActive === false) return 0;
    return variant.stock;
  }
  return product.stock;
}

/**
 * Verify every line can be fulfilled. Returns a normalised list.
 * Throws with a customer-readable message on the first problem.
 */
export async function assertStockAvailable(lines) {
  const checked = [];
  for (const line of lines) {
    // eslint-disable-next-line no-await-in-loop
    const product = await Product.findById(line.product);
    if (!product) throw ApiError.badRequest('A product in your cart is no longer available');
    if (product.status !== 'active') throw ApiError.badRequest(`${product.name} is currently unavailable`);

    const available = availableStock(product, line.variantId);
    if (available < line.quantity) {
      throw ApiError.conflict(
        available === 0
          ? `${product.name} just sold out`
          : `Only ${available} left of ${product.name}`,
        { productId: product._id, available },
      );
    }
    checked.push({ product, variantId: line.variantId, quantity: line.quantity });
  }
  return checked;
}

/** Apply a delta to a product/variant and record it. Negative = deduct. */
export async function adjustStock({
  productId, variantId = null, delta, reason, note = '', order = null, performedBy = 'system',
}) {
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');

  let previousStock;
  let newStock;
  let sku = product.sku;

  if (variantId) {
    const variant = product.variants.id(variantId);
    if (!variant) throw ApiError.badRequest('Variant not found');
    previousStock = variant.stock;
    newStock = Math.max(0, previousStock + delta);
    variant.stock = newStock;
    sku = variant.sku;
  } else {
    previousStock = product.stock;
    newStock = Math.max(0, previousStock + delta);
    product.stock = newStock;
  }

  // The pre-save hook recomputes product.stock from variants when they exist.
  await product.save();

  await InventoryLog.create({
    product: product._id,
    variantId,
    sku,
    previousStock,
    adjustment: delta,
    newStock,
    reason,
    note,
    order,
    performedBy,
  });

  return { product, previousStock, newStock };
}

/** Deduct stock for every line of a confirmed order (idempotent per order). */
export async function deductForOrder(order, performedBy = 'system') {
  if (order.stockDeducted) return;
  for (const item of order.items) {
    // eslint-disable-next-line no-await-in-loop
    await adjustStock({
      productId: item.product,
      variantId: item.variantId,
      delta: -item.quantity,
      reason: 'order_placed',
      note: `Order ${order.orderNumber}`,
      order: order._id,
      performedBy,
    });
    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne({ _id: item.product }, { $inc: { unitsSold: item.quantity } });
  }
  order.stockDeducted = true;
  await order.save();
}

/** Return stock to inventory after a cancellation or return. */
export async function restoreForOrder(order, reason = 'order_cancelled', performedBy = 'system') {
  if (!order.stockDeducted || order.stockRestored) return;
  for (const item of order.items) {
    // eslint-disable-next-line no-await-in-loop
    await adjustStock({
      productId: item.product,
      variantId: item.variantId,
      delta: item.quantity,
      reason,
      note: `Order ${order.orderNumber}`,
      order: order._id,
      performedBy,
    });
    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne(
      { _id: item.product },
      { $inc: { unitsSold: -item.quantity } },
    );
  }
  order.stockRestored = true;
  await order.save();
}
