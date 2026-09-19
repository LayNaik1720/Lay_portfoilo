import mongoose from 'mongoose';
import slugify from 'slugify';

/** A concrete purchasable combination (colour + size) with its own stock. */
const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true, trim: true, uppercase: true },
  color: { type: String, default: '', trim: true },
  colorHex: { type: String, default: '', trim: true },
  size: { type: String, default: 'Free Size', trim: true },
  stock: { type: Number, default: 0, min: 0 },
  priceDelta: { type: Number, default: 0 },
  image: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { _id: true, timestamps: false });

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  alt: { type: String, default: '' },
  isPrimary: { type: Boolean, default: false },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Product name is required'], trim: true, index: true },
  slug: { type: String, unique: true, index: true, lowercase: true, trim: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },

  shortDescription: { type: String, default: '', trim: true, maxlength: 300 },
  description: { type: String, default: '', trim: true },

  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, default: null, min: 0 },

  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  subcategory: { type: String, default: '', trim: true },
  collectionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', default: null, index: true },

  images: { type: [imageSchema], default: [] },
  variants: { type: [variantSchema], default: [] },

  sizes: { type: [String], default: [] },
  colors: { type: [String], default: [] },

  fabric: { type: String, default: '', trim: true, index: true },
  material: { type: String, default: '', trim: true },
  careInstructions: { type: String, default: '', trim: true },
  tags: { type: [String], default: [], index: true },

  stock: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 3, min: 0 },

  isNewArrival: { type: Boolean, default: false, index: true },
  isBestSeller: { type: Boolean, default: false, index: true },
  isFeatured: { type: Boolean, default: false, index: true },
  isOnSale: { type: Boolean, default: false, index: true },
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active', index: true },

  ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0, min: 0 },
  unitsSold: { type: Number, default: 0, min: 0 },
  viewCount: { type: Number, default: 0 },

  seoTitle: { type: String, default: '' },
  seoDescription: { type: String, default: '' },

  isDemo: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

productSchema.index({ name: 'text', tags: 'text', shortDescription: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

productSchema.pre('validate', function generateSlug(next) {
  if (!this.slug && this.name) this.slug = slugify(this.name, { lower: true, strict: true });
  next();
});

/** Keep denormalised stock/flags consistent with the variant list. */
productSchema.pre('save', function syncAggregates(next) {
  if (this.variants?.length) {
    this.stock = this.variants
      .filter((v) => v.isActive !== false)
      .reduce((sum, v) => sum + (v.stock || 0), 0);
    const colors = [...new Set(this.variants.map((v) => v.color).filter(Boolean))];
    const sizes = [...new Set(this.variants.map((v) => v.size).filter(Boolean))];
    if (colors.length) this.colors = colors;
    if (sizes.length) this.sizes = sizes;
  }
  this.isOnSale = Boolean(this.originalPrice && this.originalPrice > this.price);
  next();
});

productSchema.virtual('discountPercentage').get(function discount() {
  if (!this.originalPrice || this.originalPrice <= this.price) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

productSchema.virtual('inStock').get(function inStock() {
  return (this.stock || 0) > 0;
});

productSchema.virtual('isLowStock').get(function isLowStock() {
  return this.stock > 0 && this.stock <= this.lowStockThreshold;
});

productSchema.virtual('primaryImage').get(function primaryImage() {
  // `images` may be absent when a query selects a subset of fields.
  const images = this.images || [];
  const primary = images.find((i) => i.isPrimary);
  return primary?.url || images[0]?.url || '';
});

export const Product = mongoose.model('Product', productSchema);
