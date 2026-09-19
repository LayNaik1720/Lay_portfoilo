import mongoose from 'mongoose';
import slugify from 'slugify';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Category name is required'], trim: true },
  slug: { type: String, unique: true, index: true, lowercase: true, trim: true },
  subtitle: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true },
  image: { type: String, default: '' },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  subcategories: { type: [String], default: [] },
  displayOrder: { type: Number, default: 0, index: true },
  isVisible: { type: Boolean, default: true, index: true },
  // Drives the asymmetric editorial grid on the homepage.
  featureSize: { type: String, enum: ['large', 'tall', 'wide', 'regular'], default: 'regular' },
  isDemo: { type: Boolean, default: false },
}, { timestamps: true });

categorySchema.pre('validate', function generateSlug(next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export const Category = mongoose.model('Category', categorySchema);
