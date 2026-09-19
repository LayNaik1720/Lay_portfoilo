import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createOrder, changeOrderStatus, markOrderPaid, trackerSteps, allowedTransitions } from '../services/orderService.js';
import { paymentService } from '../services/paymentService.js';

export const placeOrder = asyncHandler(async (req, res) => {
  const { customer, items, shippingAddress, paymentMethod, couponCode, customerNote } = req.body;

  const order = await createOrder({
    user: req.user || null,
    customer,
    items: items.map((i) => ({
      product: i.productId,
      variantId: i.variantId || null,
      quantity: i.quantity,
    })),
    shippingAddress,
    paymentMethod,
    couponCode,
    customerNote,
  });

  // Online payments need a gateway order before the client can pay.
  let payment = null;
  if (paymentMethod !== 'cod') {
    payment = await paymentService.createPaymentOrder({
      amount: order.total,
      receipt: order.orderNumber,
    });
    order.payment.provider = payment.provider;
    order.payment.orderId = payment.orderId;
    order.paymentStatus = 'processing';
    order.status = 'payment_processing';
    order.statusHistory.push({ status: 'payment_processing', note: 'Awaiting payment', by: 'system' });
    await order.save();
  }

  res.status(201).json({ success: true, data: { order, payment } });
});

/** Verify a gateway signature server-side and confirm the order. */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature } = req.body;

  const order = await Order.findOne({ 'payment.orderId': orderId });
  if (!order) throw ApiError.notFound('Order not found for that payment');

  const valid = paymentService.verifySignature({ orderId, paymentId, signature });
  if (!valid) {
    order.paymentStatus = 'failed';
    order.statusHistory.push({ status: order.status, note: 'Payment verification failed', by: 'system' });
    await order.save();
    throw ApiError.badRequest('Payment verification failed. You have not been charged.');
  }

  await markOrderPaid(order, { provider: paymentService.providerName, orderId, paymentId, signature });
  res.json({ success: true, data: { order } });
});

/** Development-only helper that mimics the gateway callback. */
export const simulatePayment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  if (!order.payment.orderId) throw ApiError.badRequest('That order has no pending payment');

  const paymentId = `mock_pay_${Date.now()}`;
  const signature = paymentService.signForTesting({ orderId: order.payment.orderId, paymentId });

  res.json({ success: true, data: { orderId: order.payment.orderId, paymentId, signature } });
});

export const listMyOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 10);
  const filter = { $or: [{ user: req.user._id }, { 'customer.email': req.user.email }] };

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({ success: true, data: orders, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
});

export const getMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  const owns = (order.user && String(order.user) === String(req.user._id))
    || order.customer.email === req.user.email;
  if (!owns && req.user.role !== 'admin') throw ApiError.forbidden('That is not your order');

  res.json({ success: true, data: { order, tracker: trackerSteps(order) } });
});

/** Public confirmation lookup by order number — used by the success page. */
/**
 * Guest order lookup.
 *
 * Knowing an order number alone is not sufficient to view an order: the
 * caller must also supply the email it was placed with. Signed-in owners
 * (and admins) skip that check.
 */
export const getOrderByNumber = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  if (!order) throw ApiError.notFound('Order not found');

  const email = String(req.query.email || '').trim().toLowerCase();
  const isOwner = req.user && (
    (order.user && String(order.user) === String(req.user._id))
    || order.customer.email === req.user.email
    || req.user.role === 'admin'
  );

  if (!isOwner && email !== String(order.customer.email).toLowerCase()) {
    throw ApiError.forbidden('Enter the email used to place this order to view it.');
  }

  res.json({ success: true, data: { order, tracker: trackerSteps(order) } });
});

export const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  const owns = (order.user && String(order.user) === String(req.user._id))
    || order.customer.email === req.user.email;
  if (!owns) throw ApiError.forbidden('That is not your order');

  if (!['pending', 'payment_processing', 'payment_confirmed', 'confirmed', 'packed'].includes(order.status)) {
    throw ApiError.badRequest('This order can no longer be cancelled. Please contact the boutique.');
  }

  await changeOrderStatus(order, 'cancelled', {
    note: req.body.reason || 'Cancelled by customer',
    by: 'customer',
    force: true,
  });
  res.json({ success: true, data: { order } });
});

export const requestReturn = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  const owns = (order.user && String(order.user) === String(req.user._id))
    || order.customer.email === req.user.email;
  if (!owns) throw ApiError.forbidden('That is not your order');
  if (order.status !== 'delivered') throw ApiError.badRequest('Only delivered orders can be returned');

  order.returnReason = req.body.reason || '';
  await changeOrderStatus(order, 'return_requested', { note: order.returnReason, by: 'customer' });
  res.json({ success: true, data: { order } });
});

// ---- admin ----------------------------------------------------------------

export const adminListOrders = asyncHandler(async (req, res) => {
  const { page: p, limit: l, status, search, paymentStatus } = req.query;
  const page = Math.max(1, Number(p) || 1);
  const limit = Math.min(100, Number(l) || 20);

  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ orderNumber: rx }, { 'customer.name': rx }, { 'customer.email': rx }, { 'customer.mobile': rx }];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);

  res.json({ success: true, data: orders, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
});

export const adminGetOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email mobile');
  if (!order) throw ApiError.notFound('Order not found');
  res.json({
    success: true,
    data: {
      order,
      tracker: trackerSteps(order),
      // So the dashboard can only offer legal next steps.
      allowedTransitions: allowedTransitions(order.status),
    },
  });
});

export const adminUpdateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  const { status, note, trackingNumber, courier, force } = req.body;
  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
  if (courier !== undefined) order.courier = courier;

  await changeOrderStatus(order, status, { note, by: req.user.email, force: Boolean(force) });
  res.json({ success: true, data: { order, tracker: trackerSteps(order) } });
});

export const adminUpdateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');

  const { adminNote, trackingNumber, courier, paymentStatus } = req.body;
  if (adminNote !== undefined) order.adminNote = adminNote;
  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
  if (courier !== undefined) order.courier = courier;
  if (paymentStatus !== undefined) order.paymentStatus = paymentStatus;

  await order.save();
  res.json({ success: true, data: { order } });
});

/** Aggregated numbers for the admin dashboard home. */
export const adminDashboard = asyncHandler(async (_req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const revenueMatch = { status: { $nin: ['cancelled', 'refunded', 'returned'] } };

  const [
    totals, todayTotals, monthTotals, statusCounts, customers, productStats, recentOrders, bestSellers, dailySeries,
  ] = await Promise.all([
    Order.aggregate([{ $match: revenueMatch }, { $group: { _id: null, sales: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { ...revenueMatch, createdAt: { $gte: startOfToday } } },
      { $group: { _id: null, sales: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { ...revenueMatch, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, sales: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.countDocuments({ role: 'customer' }),
    Product.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          outOfStock: { $sum: { $cond: [{ $lte: ['$stock', 0] }, 1, 0] } },
          lowStock: {
            $sum: {
              $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] }, 1, 0],
            },
          },
        },
      },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(8).select('orderNumber customer total status createdAt items'),
    Order.aggregate([
      { $match: revenueMatch },
      { $unwind: '$items' },
      { $group: { _id: { product: '$items.product', name: '$items.name' }, units: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' } } },
      { $sort: { units: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate([
      { $match: { ...revenueMatch, createdAt: { $gte: new Date(Date.now() - 29 * 86400000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, sales: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
  const completed = (byStatus.delivered || 0);
  const pending = (byStatus.pending || 0) + (byStatus.payment_processing || 0)
    + (byStatus.payment_confirmed || 0) + (byStatus.confirmed || 0) + (byStatus.packed || 0) + (byStatus.shipped || 0);

  res.json({
    success: true,
    data: {
      sales: {
        total: totals[0]?.sales || 0,
        today: todayTotals[0]?.sales || 0,
        month: monthTotals[0]?.sales || 0,
      },
      orders: {
        total: totals[0]?.count || 0,
        today: todayTotals[0]?.count || 0,
        pending,
        completed,
        cancelled: byStatus.cancelled || 0,
        byStatus,
      },
      customers,
      products: productStats[0] || { total: 0, active: 0, outOfStock: 0, lowStock: 0 },
      recentOrders,
      bestSellers: bestSellers.map((b) => ({
        productId: b._id.product, name: b._id.name, units: b.units, revenue: b.revenue,
      })),
      dailySeries: dailySeries.map((d) => ({ date: d._id, sales: d.sales, orders: d.orders })),
    },
  });
});
