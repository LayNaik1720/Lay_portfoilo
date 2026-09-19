/**
 * Order lifecycle: creation with stock validation, status transitions,
 * and the side effects each transition triggers.
 */
import { Order, FULFILMENT_FLOW } from '../models/Order.js';
import { Coupon } from '../models/Coupon.js';
import { Cart } from '../models/Cart.js';
import { ApiError } from '../utils/ApiError.js';
import { assertStockAvailable, deductForOrder, restoreForOrder } from './inventoryService.js';
import { buildLines, summarise } from './pricingService.js';

/** Transitions an admin is allowed to make from each status. */
const ALLOWED_TRANSITIONS = {
  pending: ['payment_processing', 'payment_confirmed', 'confirmed', 'cancelled'],
  payment_processing: ['payment_confirmed', 'confirmed', 'cancelled'],
  payment_confirmed: ['confirmed', 'packed', 'cancelled'],
  confirmed: ['packed', 'shipped', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'return_requested'],
  delivered: ['return_requested'],
  cancelled: [],
  return_requested: ['returned', 'delivered'],
  returned: ['refund_initiated'],
  refund_initiated: ['refunded'],
  refunded: [],
};

export function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

/** Statuses an order may legally move to next — drives the admin UI. */
export function allowedTransitions(from) {
  return ALLOWED_TRANSITIONS[from] || [];
}

export function trackerSteps(order) {
  const currentIndex = FULFILMENT_FLOW.indexOf(order.status);
  return FULFILMENT_FLOW.map((status, index) => ({
    status,
    reached: currentIndex >= index && currentIndex !== -1,
    current: currentIndex === index,
    at: order.statusHistory.find((h) => h.status === status)?.at || null,
  }));
}

/**
 * Create an order from validated input.
 * Re-checks stock immediately before writing to prevent overselling.
 */
export async function createOrder({ user, customer, items, shippingAddress, paymentMethod, couponCode, customerNote }) {
  if (!items?.length) throw ApiError.badRequest('Your cart is empty');

  // Final authoritative stock check.
  const checked = await assertStockAvailable(items);
  const lines = buildLines(checked);
  const totals = await summarise(lines, { couponCode, user, paymentMethod });

  if (couponCode && totals.couponError) {
    throw ApiError.badRequest(totals.couponError);
  }

  const orderNumber = await Order.generateOrderNumber();
  const initialStatus = paymentMethod === 'cod' ? 'confirmed' : 'pending';

  const order = await Order.create({
    orderNumber,
    user: user?._id || null,
    customer,
    items: lines.map((line) => ({
      product: line.product._id,
      variantId: line.variantId,
      name: line.product.name,
      slug: line.product.slug,
      sku: line.variant?.sku || line.product.sku,
      image: line.variant?.image || line.product.images[0]?.url || '',
      color: line.variant?.color || '',
      size: line.variant?.size || '',
      unitPrice: line.unitPrice,
      originalPrice: line.product.originalPrice,
      quantity: line.quantity,
      lineTotal: line.lineTotal,
    })),
    shippingAddress,
    subtotal: totals.subtotal,
    discount: totals.discount,
    couponCode: totals.couponCode,
    shippingFee: totals.shippingFee,
    total: totals.total,
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
    status: initialStatus,
    statusHistory: [{ status: initialStatus, note: 'Order placed', by: 'customer' }],
    customerNote: customerNote || '',
  });

  // COD orders are confirmed immediately, so reserve stock now.
  if (paymentMethod === 'cod') {
    await deductForOrder(order, 'system');
  }

  if (totals.couponCode) {
    await Coupon.updateOne({ code: totals.couponCode }, { $inc: { usageCount: 1 } });
  }

  if (user) {
    await Cart.updateOne({ user: user._id }, { $set: { items: [], couponCode: '' } });
  }

  return order;
}

/** Mark an online payment as captured and confirm the order. */
export async function markOrderPaid(order, paymentDetails) {
  order.paymentStatus = 'paid';
  order.payment = {
    provider: paymentDetails.provider,
    orderId: paymentDetails.orderId,
    paymentId: paymentDetails.paymentId,
    signature: paymentDetails.signature,
    paidAt: new Date(),
  };
  order.status = 'payment_confirmed';
  order.statusHistory.push({ status: 'payment_confirmed', note: 'Payment verified', by: 'system' });
  await order.save();

  await deductForOrder(order, 'system');
  return order;
}

/** Apply a status change plus its inventory side effects. */
export async function changeOrderStatus(order, nextStatus, { note = '', by = 'admin', force = false } = {}) {
  if (order.status === nextStatus) return order;
  if (!force && !canTransition(order.status, nextStatus)) {
    throw ApiError.badRequest(`Cannot move an order from "${order.status}" to "${nextStatus}"`);
  }

  order.status = nextStatus;
  order.statusHistory.push({ status: nextStatus, note, by, at: new Date() });

  if (nextStatus === 'cancelled') {
    order.cancellationReason = note || order.cancellationReason;
    await restoreForOrder(order, 'order_cancelled', by);
  }
  if (nextStatus === 'returned') {
    await restoreForOrder(order, 'order_returned', by);
  }
  if (nextStatus === 'delivered') {
    if (order.paymentMethod === 'cod') order.paymentStatus = 'paid';
  }
  if (nextStatus === 'refunded') {
    order.paymentStatus = 'refunded';
  }
  if (['confirmed', 'packed', 'shipped'].includes(nextStatus) && !order.stockDeducted) {
    await deductForOrder(order, by);
  }

  await order.save();
  return order;
}
