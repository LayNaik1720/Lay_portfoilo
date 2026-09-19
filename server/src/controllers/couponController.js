import { Coupon } from '../models/Coupon.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateCoupon } from '../services/pricingService.js';

/** Public: check a coupon against a subtotal without applying it. */
export const checkCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal = 0 } = req.body;
  const { coupon, discount } = await validateCoupon(code, Number(subtotal), req.user || null);
  res.json({
    success: true,
    data: {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount,
    },
  });
});

export const adminListCoupons = asyncHandler(async (_req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ success: true, data: coupons });
});

export const adminCreateCoupon = asyncHandler(async (req, res) => {
  const code = String(req.body.code).toUpperCase().trim();
  if (await Coupon.exists({ code })) throw ApiError.conflict('That coupon code already exists');
  const coupon = await Coupon.create({ ...req.body, code });
  res.status(201).json({ success: true, data: coupon });
});

export const adminUpdateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');

  if (req.body.code) {
    const code = String(req.body.code).toUpperCase().trim();
    if (code !== coupon.code && await Coupon.exists({ code })) {
      throw ApiError.conflict('That coupon code already exists');
    }
    req.body.code = code;
  }

  Object.assign(coupon, req.body);
  await coupon.save();
  res.json({ success: true, data: coupon });
});

export const adminDeleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found');
  res.json({ success: true, message: 'Coupon deleted' });
});
