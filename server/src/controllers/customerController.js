import { User } from '../models/User.js';
import { Order } from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Admin: customer list enriched with real order totals. */
export const adminListCustomers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);

  const filter = { role: 'customer' };
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { mobile: rx }];
  }

  const [customers, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);

  const stats = await Order.aggregate([
    { $match: { status: { $nin: ['cancelled'] } } },
    { $group: { _id: '$customer.email', orders: { $sum: 1 }, spent: { $sum: '$total' }, last: { $max: '$createdAt' } } },
  ]);
  const statMap = new Map(stats.map((s) => [s._id, s]));

  res.json({
    success: true,
    data: customers.map((c) => {
      const s = statMap.get(c.email);
      return {
        ...c.toJSON(),
        orderCount: s?.orders || 0,
        totalSpent: s?.spent || 0,
        lastOrderAt: s?.last || null,
      };
    }),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  });
});

export const adminGetCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');

  const orders = await Order.find({
    $or: [{ user: customer._id }, { 'customer.email': customer.email }],
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: {
      customer,
      orders,
      stats: {
        orderCount: orders.length,
        totalSpent: orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0),
      },
    },
  });
});

export const adminToggleCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findById(req.params.id);
  if (!customer) throw ApiError.notFound('Customer not found');
  if (customer.role === 'admin') throw ApiError.forbidden('Administrator accounts cannot be disabled here');

  customer.isActive = req.body.isActive;
  await customer.save();
  res.json({ success: true, data: customer });
});
