import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  name: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, default: '', trim: true },
  comment: { type: String, required: true, trim: true, maxlength: 2000 },
  image: { type: String, default: '' },
  isVerifiedPurchase: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  isDemo: { type: Boolean, default: false },
}, { timestamps: true });

reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ product: 1, user: 1 });

export const Review = mongoose.model('Review', reviewSchema);
