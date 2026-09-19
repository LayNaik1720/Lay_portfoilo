/**
 * Editorial + marketing content models managed from the admin dashboard:
 * testimonials, stories/reels, banners and FAQs.
 */
import mongoose from 'mongoose';

const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  location: { type: String, default: '', trim: true },
  rating: { type: Number, default: 5, min: 1, max: 5 },
  quote: { type: String, required: true, trim: true, maxlength: 1000 },
  image: { type: String, default: '' },
  displayOrder: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true, index: true },
  isDemo: { type: Boolean, default: false },
}, { timestamps: true });

const storySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  image: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  link: { type: String, default: '' },
  kind: { type: String, enum: ['reel', 'lookbook', 'event', 'behind_the_scenes', 'styling'], default: 'reel' },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  isDemo: { type: Boolean, default: false },
}, { timestamps: true });

const bannerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subtitle: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  image: { type: String, default: '' },
  mobileImage: { type: String, default: '' },
  primaryLabel: { type: String, default: '' },
  primaryLink: { type: String, default: '' },
  secondaryLabel: { type: String, default: '' },
  secondaryLink: { type: String, default: '' },
  placement: { type: String, enum: ['hero', 'promo', 'category'], default: 'hero', index: true },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  isDemo: { type: Boolean, default: false },
}, { timestamps: true });

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true, trim: true },
  category: { type: String, default: 'General', trim: true },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  isDemo: { type: Boolean, default: false },
}, { timestamps: true });

export const Testimonial = mongoose.model('Testimonial', testimonialSchema);
export const Story = mongoose.model('Story', storySchema);
export const Banner = mongoose.model('Banner', bannerSchema);
export const Faq = mongoose.model('Faq', faqSchema);
