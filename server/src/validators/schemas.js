import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const registerSchema = z.object({
  name: z.string().min(2, 'Please enter your name').max(80),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  mobile: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Please enter your password'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  mobile: z.string().max(20).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const addressSchema = z.object({
  label: z.string().max(40).optional(),
  fullName: z.string().min(2, 'Name is required').max(80),
  mobile: z.string().min(6, 'A contact number is required').max(20),
  house: z.string().min(1, 'House / flat is required').max(120),
  street: z.string().max(120).optional().default(''),
  area: z.string().max(120).optional().default(''),
  city: z.string().min(1, 'City is required').max(80),
  state: z.string().min(1, 'State is required').max(80),
  pincode: z.string().regex(/^\d{4,10}$/, 'Enter a valid pincode'),
  country: z.string().max(60).optional().default('India'),
  isDefault: z.boolean().optional(),
});

export const addToCartSchema = z.object({
  productId: objectId,
  variantId: objectId.nullable().optional(),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(20),
});

export const guestCartSchema = z.object({
  items: z.array(z.object({
    productId: objectId,
    variantId: objectId.nullable().optional(),
    quantity: z.coerce.number().int().min(1).max(20),
  })).default([]),
  couponCode: z.string().max(40).optional().default(''),
});

export const placeOrderSchema = z.object({
  customer: z.object({
    name: z.string().min(2, 'Name is required').max(80),
    email: z.string().email('A valid email is required'),
    mobile: z.string().min(6, 'A contact number is required').max(20),
  }),
  items: z.array(z.object({
    productId: objectId,
    variantId: objectId.nullable().optional(),
    quantity: z.coerce.number().int().min(1).max(20),
  })).min(1, 'Your bag is empty'),
  shippingAddress: addressSchema.omit({ label: true, isDefault: true }),
  paymentMethod: z.enum(['cod', 'upi', 'card', 'netbanking', 'wallet', 'online']),
  couponCode: z.string().max(40).optional().default(''),
  customerNote: z.string().max(500).optional().default(''),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
});

export const orderStatusSchema = z.object({
  status: z.enum([
    'pending', 'payment_processing', 'payment_confirmed', 'confirmed', 'packed',
    'shipped', 'delivered', 'cancelled', 'return_requested', 'returned',
    'refund_initiated', 'refunded',
  ]),
  note: z.string().max(400).optional().default(''),
  trackingNumber: z.string().max(80).optional(),
  courier: z.string().max(80).optional(),
  force: z.boolean().optional(),
});

const variantSchema = z.object({
  _id: objectId.optional(),
  sku: z.string().min(1).max(60),
  color: z.string().max(40).optional().default(''),
  colorHex: z.string().max(20).optional().default(''),
  size: z.string().max(40).optional().default('Free Size'),
  stock: z.coerce.number().int().min(0).default(0),
  priceDelta: z.coerce.number().default(0),
  image: z.string().max(500).optional().default(''),
  isActive: z.boolean().optional().default(true),
});

export const productSchema = z.object({
  name: z.string().min(2, 'Product name is required').max(160),
  slug: z.string().max(180).optional(),
  sku: z.string().min(1, 'SKU is required').max(60),
  shortDescription: z.string().max(300).optional().default(''),
  description: z.string().max(8000).optional().default(''),
  price: z.coerce.number().min(0, 'Price is required'),
  originalPrice: z.coerce.number().min(0).nullable().optional(),
  category: objectId,
  subcategory: z.string().max(80).optional().default(''),
  collectionRef: objectId.nullable().optional(),
  images: z.array(z.object({
    url: z.string().min(1),
    alt: z.string().max(200).optional().default(''),
    isPrimary: z.boolean().optional().default(false),
  })).optional().default([]),
  variants: z.array(variantSchema).optional().default([]),
  sizes: z.array(z.string().max(40)).optional().default([]),
  colors: z.array(z.string().max(40)).optional().default([]),
  fabric: z.string().max(80).optional().default(''),
  material: z.string().max(160).optional().default(''),
  careInstructions: z.string().max(1000).optional().default(''),
  tags: z.array(z.string().max(40)).optional().default([]),
  stock: z.coerce.number().int().min(0).optional().default(0),
  lowStockThreshold: z.coerce.number().int().min(0).optional().default(3),
  isNewArrival: z.boolean().optional().default(false),
  isBestSeller: z.boolean().optional().default(false),
  isFeatured: z.boolean().optional().default(false),
  status: z.enum(['active', 'draft', 'archived']).optional().default('active'),
  seoTitle: z.string().max(200).optional().default(''),
  seoDescription: z.string().max(400).optional().default(''),
});

export const productUpdateSchema = productSchema.partial();

export const categorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().max(100).optional(),
  subtitle: z.string().max(160).optional().default(''),
  description: z.string().max(2000).optional().default(''),
  image: z.string().max(500).optional().default(''),
  subcategories: z.array(z.string().max(60)).optional().default([]),
  displayOrder: z.coerce.number().int().optional().default(0),
  isVisible: z.boolean().optional().default(true),
  featureSize: z.enum(['large', 'tall', 'wide', 'regular']).optional().default('regular'),
});

export const couponSchema = z.object({
  code: z.string().min(2).max(40),
  description: z.string().max(200).optional().default(''),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.coerce.number().min(0),
  minOrderValue: z.coerce.number().min(0).optional().default(0),
  maxDiscount: z.coerce.number().min(0).nullable().optional(),
  startDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().nullable().optional(),
  usageLimit: z.coerce.number().int().min(0).nullable().optional(),
  perCustomerLimit: z.coerce.number().int().min(0).nullable().optional(),
  eligibility: z.enum(['all', 'new_customers', 'existing_customers']).optional().default('all'),
  isActive: z.boolean().optional().default(true),
});

export const reviewSchema = z.object({
  productId: objectId,
  rating: z.coerce.number().int().min(1, 'Please choose a rating').max(5),
  title: z.string().max(120).optional().default(''),
  comment: z.string().min(4, 'Please write a short review').max(2000),
  image: z.string().max(500).optional().default(''),
});

export const testimonialSchema = z.object({
  name: z.string().min(2).max(80),
  location: z.string().max(80).optional().default(''),
  rating: z.coerce.number().int().min(1).max(5).optional().default(5),
  quote: z.string().min(4).max(1000),
  image: z.string().max(500).optional().default(''),
  displayOrder: z.coerce.number().int().optional().default(0),
  isPublished: z.boolean().optional().default(true),
});

export const storySchema = z.object({
  title: z.string().min(2).max(140),
  description: z.string().max(1000).optional().default(''),
  image: z.string().max(500).optional().default(''),
  videoUrl: z.string().max(500).optional().default(''),
  link: z.string().max(500).optional().default(''),
  kind: z.enum(['reel', 'lookbook', 'event', 'behind_the_scenes', 'styling']).optional().default('reel'),
  displayOrder: z.coerce.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const faqSchema = z.object({
  question: z.string().min(4).max(300),
  answer: z.string().min(4).max(3000),
  category: z.string().max(60).optional().default('General'),
  displayOrder: z.coerce.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const bannerSchema = z.object({
  title: z.string().min(2).max(160),
  subtitle: z.string().max(300).optional().default(''),
  eyebrow: z.string().max(120).optional().default(''),
  image: z.string().max(500).optional().default(''),
  mobileImage: z.string().max(500).optional().default(''),
  primaryLabel: z.string().max(60).optional().default(''),
  primaryLink: z.string().max(300).optional().default(''),
  secondaryLabel: z.string().max(60).optional().default(''),
  secondaryLink: z.string().max(300).optional().default(''),
  placement: z.enum(['hero', 'promo', 'category']).optional().default('hero'),
  displayOrder: z.coerce.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const inventoryAdjustSchema = z.object({
  variantId: objectId.nullable().optional(),
  adjustment: z.coerce.number().int(),
  reason: z.enum(['manual_adjustment', 'restock', 'correction']).optional().default('manual_adjustment'),
  note: z.string().max(300).optional().default(''),
});

export const inventorySetSchema = z.object({
  variantId: objectId.nullable().optional(),
  stock: z.coerce.number().int().min(0),
  note: z.string().max(300).optional().default(''),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
  search: z.string().max(120).optional(),
  category: z.string().max(200).optional(),
  collection: z.string().max(60).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  size: z.string().max(120).optional(),
  color: z.string().max(120).optional(),
  fabric: z.string().max(120).optional(),
  tag: z.string().max(120).optional(),
  availability: z.enum(['in_stock', 'out_of_stock']).optional(),
  minDiscount: z.coerce.number().min(0).max(100).optional(),
  onSale: z.string().optional(),
  sale: z.string().optional(),
  newArrival: z.string().optional(),
  bestSeller: z.string().optional(),
  featured: z.string().optional(),
  status: z.string().optional(),
  sort: z.string().max(40).optional(),
});
