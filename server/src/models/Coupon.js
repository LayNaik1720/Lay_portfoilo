import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  description: { type: String, default: '' },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  minOrderValue: { type: Number, default: 0, min: 0 },
  maxDiscount: { type: Number, default: null, min: 0 },
  startDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, default: null },
  usageLimit: { type: Number, default: null, min: 0 },
  usageCount: { type: Number, default: 0, min: 0 },
  perCustomerLimit: { type: Number, default: null, min: 0 },
  eligibility: { type: String, enum: ['all', 'new_customers', 'existing_customers'], default: 'all' },
  isActive: { type: Boolean, default: true, index: true },
  isDemo: { type: Boolean, default: false },
}, { timestamps: true });

/** Compute the rupee discount this coupon grants on a given subtotal. */
couponSchema.methods.computeDiscount = function computeDiscount(subtotal) {
  let discount = this.discountType === 'percentage'
    ? (subtotal * this.discountValue) / 100
    : this.discountValue;
  if (this.maxDiscount != null) discount = Math.min(discount, this.maxDiscount);
  return Math.max(0, Math.min(Math.round(discount), subtotal));
};

export const Coupon = mongoose.model('Coupon', couponSchema);
