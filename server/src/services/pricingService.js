/**
 * Cart pricing: line totals, coupon validation and shipping rules.
 * Prices are always recomputed server-side — the client is never trusted.
 */
import { Coupon } from '../models/Coupon.js';
import { Order } from '../models/Order.js';
import { Settings } from '../models/Settings.js';
import { ApiError } from '../utils/ApiError.js';
import { availableStock } from './inventoryService.js';

export function priceForVariant(product, variantId) {
  const base = product.price;
  if (!variantId) return base;
  const variant = product.variants.id(variantId);
  return base + (variant?.priceDelta || 0);
}

/** Build enriched cart lines from raw {product, variantId, quantity} entries. */
export function buildLines(entries) {
  return entries.map(({ product, variantId, quantity }) => {
    const variant = variantId ? product.variants.id(variantId) : null;
    const unitPrice = priceForVariant(product, variantId);
    const stock = availableStock(product, variantId);
    return {
      product,
      variant,
      variantId: variantId || null,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
      stock,
      inStock: stock >= quantity,
    };
  });
}

/**
 * Validate a coupon for a subtotal and (optionally) a customer.
 * Returns { coupon, discount } or throws a readable error.
 */
export async function validateCoupon(code, subtotal, user = null) {
  if (!code) return { coupon: null, discount: 0 };

  const coupon = await Coupon.findOne({ code: String(code).toUpperCase().trim() });
  if (!coupon) throw ApiError.badRequest('That coupon code is not valid');
  if (!coupon.isActive) throw ApiError.badRequest('That coupon is no longer active');

  const now = new Date();
  if (coupon.startDate && now < coupon.startDate) throw ApiError.badRequest('That coupon is not active yet');
  if (coupon.expiryDate && now > coupon.expiryDate) throw ApiError.badRequest('That coupon has expired');
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    throw ApiError.badRequest('That coupon has reached its usage limit');
  }
  if (subtotal < coupon.minOrderValue) {
    throw ApiError.badRequest(`Add ₹${(coupon.minOrderValue - subtotal).toLocaleString('en-IN')} more to use ${coupon.code}`);
  }

  if (user) {
    const previousOrders = await Order.countDocuments({
      user: user._id,
      status: { $nin: ['cancelled'] },
      isDemo: { $ne: true },
    });
    if (coupon.eligibility === 'new_customers' && previousOrders > 0) {
      throw ApiError.badRequest('That coupon is for first-time customers only');
    }
    if (coupon.eligibility === 'existing_customers' && previousOrders === 0) {
      throw ApiError.badRequest('That coupon is for returning customers only');
    }
    if (coupon.perCustomerLimit != null) {
      const used = await Order.countDocuments({ user: user._id, couponCode: coupon.code });
      if (used >= coupon.perCustomerLimit) {
        throw ApiError.badRequest('You have already used that coupon');
      }
    }
  }

  return { coupon, discount: coupon.computeDiscount(subtotal) };
}

/** Compute the full money breakdown for a set of lines. */
export async function summarise(lines, { couponCode = '', user = null, paymentMethod = null } = {}) {
  const settings = await Settings.getSettings();
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  let discount = 0;
  let appliedCoupon = null;
  let couponError = null;

  if (couponCode) {
    try {
      const result = await validateCoupon(couponCode, subtotal, user);
      discount = result.discount;
      appliedCoupon = result.coupon;
    } catch (err) {
      couponError = err.message;
    }
  }

  const { freeShippingThreshold, shippingCharge, codExtraCharge } = settings.shipping;
  const discountedSubtotal = subtotal - discount;
  const qualifiesForFreeShipping = discountedSubtotal >= freeShippingThreshold;
  let shippingFee = subtotal === 0 || qualifiesForFreeShipping ? 0 : shippingCharge;
  if (paymentMethod === 'cod') shippingFee += codExtraCharge || 0;

  return {
    subtotal,
    discount,
    couponCode: appliedCoupon?.code || '',
    couponError,
    shippingFee,
    total: Math.max(0, discountedSubtotal + shippingFee),
    freeShippingThreshold,
    amountToFreeShipping: qualifiesForFreeShipping ? 0 : Math.max(0, freeShippingThreshold - discountedSubtotal),
    qualifiesForFreeShipping,
  };
}
