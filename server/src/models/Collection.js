import mongoose from 'mongoose';
import slugify from 'slugify';

const collectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, index: true, lowercase: true, trim: true },
  description: { type: String, default: '', trim: true },
  image: { type: String, default: '' },
  season: { type: String, default: '', trim: true },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  isDemo: { type: Boolean, default: false },
}, { timestamps: true });

collectionSchema.pre('validate', function generateSlug(next) {
  if (!this.slug && this.name) this.slug = slugify(this.name, { lower: true, strict: true });
  next();
});

export const ProductCollection = mongoose.model('Collection', collectionSchema);
