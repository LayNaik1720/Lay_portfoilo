/**
 * Seeds the database with demo boutique data.
 *
 * Every document created here carries `isDemo: true`. Run with `--fresh` to
 * wipe existing demo data first. Demo orders exist so that best-sellers,
 * dashboard analytics and the recent-purchase notice have genuine data to read
 * from — they are clearly flagged and should be purged before going live.
 *
 *   npm run seed            # add/refresh demo data
 *   npm run seed -- --fresh # wipe collections first
 */
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import {
  User, Category, ProductCollection, Product, Order, Coupon, Review,
  Testimonial, Story, Faq, Settings, InventoryLog, Cart, Wishlist,
} from '../models/index.js';
import { MEDIA } from './media.js';
import * as data from './data.js';

const fresh = process.argv.includes('--fresh');

async function wipe() {
  console.log('[seed] clearing existing data…');
  await Promise.all([
    User.deleteMany({}), Category.deleteMany({}), ProductCollection.deleteMany({}),
    Product.deleteMany({}), Order.deleteMany({}), Coupon.deleteMany({}),
    Review.deleteMany({}), Testimonial.deleteMany({}), Story.deleteMany({}),
    Faq.deleteMany({}), InventoryLog.deleteMany({}), Cart.deleteMany({}),
    Wishlist.deleteMany({}), Settings.deleteMany({}),
  ]);
}

async function seedUsers() {
  const admin = new User({
    name: 'Aarava Admin',
    email: env.seedAdminEmail,
    mobile: '9876543200',
    role: 'admin',
    isDemo: true,
  });
  await admin.setPassword(env.seedAdminPassword);
  await admin.save();

  const customers = [];
  for (const c of data.customers) {
    const user = new User({
      ...c,
      role: 'customer',
      isDemo: true,
      addresses: [{
        label: 'Home',
        fullName: c.name,
        mobile: c.mobile,
        house: `${10 + customers.length}A, Rivergate Residency`,
        street: 'Athwalines Main Road',
        area: 'Athwalines',
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395007',
        country: 'India',
        isDefault: true,
      }],
    });
    // The first demo customer uses the documented password so it can be logged into.
    await user.setPassword(
      c.email === env.seedCustomerEmail ? env.seedCustomerPassword : `${c.name.split(' ')[0]}@12345`,
    );
    await user.save();
    customers.push(user);
  }

  console.log(`[seed] users: 1 admin, ${customers.length} customers`);
  return { admin, customers };
}

async function seedCatalogue() {
  const categories = await Category.insertMany(data.categories.map((c) => ({ ...c, isDemo: true })));
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const collections = await ProductCollection.insertMany(data.collections.map((c) => ({ ...c, isDemo: true })));
  const collectionBySlug = new Map(collections.map((c) => [c.slug, c]));

  const products = [];
  for (const p of data.products) {
    const { categorySlug, collectionSlug, look, ...rest } = p;
    // Saved individually so the pre-save hook computes stock/flags per product.
    const product = new Product({
      ...rest,
      category: categoryBySlug.get(categorySlug)._id,
      collectionRef: collectionSlug ? collectionBySlug.get(collectionSlug)?._id ?? null : null,
      isDemo: true,
    });
    await product.save();
    products.push(product);
  }

  console.log(`[seed] catalogue: ${categories.length} categories, ${collections.length} collections, ${products.length} products`);
  return { categories, collections, products };
}

/**
 * Create demo orders spread over the last ~60 days so the dashboard charts,
 * best-sellers and recent-purchase notice have real aggregates to compute from.
 */
async function seedOrders(customers, products) {
  const inStockProducts = products.filter((p) => p.stock > 0 && p.variants.some((v) => v.stock > 0));
  const statuses = ['delivered', 'delivered', 'delivered', 'shipped', 'packed', 'confirmed', 'delivered', 'cancelled'];
  const orders = [];

  for (let i = 0; i < 26; i += 1) {
    const customer = customers[i % customers.length];
    const daysAgo = Math.floor((i / 26) * 58) + Math.floor(Math.random() * 3);
    const createdAt = new Date(Date.now() - daysAgo * 86400000 - Math.random() * 43200000);
    const status = statuses[i % statuses.length];

    const lineCount = 1 + (i % 2);
    const items = [];
    let subtotal = 0;

    for (let j = 0; j < lineCount; j += 1) {
      const product = inStockProducts[(i * 3 + j * 5) % inStockProducts.length];
      const variant = product.variants.find((v) => v.stock > 0) || product.variants[0];
      const quantity = 1 + ((i + j) % 2);
      const unitPrice = product.price + (variant?.priceDelta || 0);
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      items.push({
        product: product._id,
        variantId: variant?._id || null,
        name: product.name,
        slug: product.slug,
        sku: variant?.sku || product.sku,
        image: product.images[0]?.url || '',
        color: variant?.color || '',
        size: variant?.size || '',
        unitPrice,
        originalPrice: product.originalPrice,
        quantity,
        lineTotal,
      });
    }

    const shippingFee = subtotal >= 1000 ? 0 : 79;
    const address = customer.addresses[0];

    const history = [{ status: 'pending', note: 'Order placed', at: createdAt, by: 'customer' }];
    const flow = ['payment_confirmed', 'confirmed', 'packed', 'shipped', 'delivered'];
    const stopAt = flow.indexOf(status);
    if (status !== 'cancelled') {
      for (let s = 0; s <= stopAt; s += 1) {
        history.push({ status: flow[s], note: '', at: new Date(createdAt.getTime() + (s + 1) * 86400000), by: 'system' });
      }
    } else {
      history.push({ status: 'cancelled', note: 'Cancelled by customer', at: new Date(createdAt.getTime() + 86400000), by: 'customer' });
    }

    orders.push({
      orderNumber: `AAR-${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, '0')}${String(createdAt.getDate()).padStart(2, '0')}-${1000 + i}`,
      user: customer._id,
      customer: { name: customer.name, email: customer.email, mobile: customer.mobile },
      items,
      shippingAddress: {
        fullName: address.fullName, mobile: address.mobile, house: address.house,
        street: address.street, area: address.area, city: address.city,
        state: address.state, pincode: address.pincode, country: address.country,
      },
      subtotal,
      discount: 0,
      couponCode: '',
      shippingFee,
      total: subtotal + shippingFee,
      paymentMethod: i % 3 === 0 ? 'cod' : 'upi',
      paymentStatus: status === 'delivered' ? 'paid' : status === 'cancelled' ? 'pending' : 'paid',
      status,
      statusHistory: history,
      createdAt,
      updatedAt: createdAt,
      isDemo: true,
      // Demo orders do not move real inventory — seeded stock levels are authored.
      stockDeducted: false,
      stockRestored: false,
    });
  }

  const created = await Order.insertMany(orders);

  // Reflect demo sales in unitsSold so best-sellers rank from order data.
  const soldMap = new Map();
  for (const order of created) {
    if (['cancelled', 'returned', 'refunded'].includes(order.status)) continue;
    for (const item of order.items) {
      soldMap.set(String(item.product), (soldMap.get(String(item.product)) || 0) + item.quantity);
    }
  }
  for (const [productId, units] of soldMap) {
    await Product.updateOne({ _id: productId }, { $set: { unitsSold: units } });
  }

  console.log(`[seed] orders: ${created.length} demo orders`);
  return created;
}

async function seedReviews(customers, products, orders) {
  const samples = [
    { rating: 5, title: 'Exactly as described', comment: 'The colour is true to the photographs and the silk is heavier than I expected, in the best way. It arrived folded in muslin with a note about the weaver.' },
    { rating: 5, title: 'Worth every rupee', comment: 'I hesitated at the price and I should not have. The finishing on the inside is as careful as the outside, which tells you everything.' },
    { rating: 4, title: 'Beautiful, runs slightly large', comment: 'Lovely piece and the fabric is gorgeous. I would size down — the M was generous on me. Otherwise no complaints at all.' },
    { rating: 5, title: 'My third order', comment: 'I keep coming back. Everything softens rather than falling apart, and the customer service on WhatsApp is genuinely helpful.' },
    { rating: 4, title: 'Lovely for the festive season', comment: 'Wore this for Navratri and it moved beautifully. Mirror work is properly hand-set, not glued on.' },
  ];

  const reviews = [];
  const delivered = orders.filter((o) => o.status === 'delivered');

  for (let i = 0; i < Math.min(12, delivered.length); i += 1) {
    const order = delivered[i];
    const item = order.items[0];
    const customer = customers.find((c) => c.email === order.customer.email);
    const sample = samples[i % samples.length];

    // Only one review per customer/product pair.
    if (reviews.some((r) => String(r.product) === String(item.product) && String(r.user) === String(customer._id))) continue;

    reviews.push({
      product: item.product,
      user: customer._id,
      order: order._id,
      name: customer.name,
      rating: sample.rating,
      title: sample.title,
      comment: sample.comment,
      isVerifiedPurchase: true,
      status: 'approved',
      isDemo: true,
      createdAt: new Date(order.createdAt.getTime() + 7 * 86400000),
    });
  }

  const created = await Review.insertMany(reviews);

  // Recompute rating aggregates from the reviews just created.
  const stats = await Review.aggregate([
    { $match: { status: 'approved' } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  for (const s of stats) {
    await Product.updateOne({ _id: s._id }, {
      $set: { ratingAverage: Math.round(s.avg * 10) / 10, ratingCount: s.count },
    });
  }

  console.log(`[seed] reviews: ${created.length}`);
  return created;
}

async function seedContent() {
  await Testimonial.insertMany(data.testimonials.map((t) => ({ ...t, isDemo: true })));
  await Story.insertMany(data.stories.map((s) => ({ ...s, isDemo: true })));
  await Faq.insertMany(data.faqs.map((f) => ({ ...f, isDemo: true })));
  await Coupon.insertMany(data.coupons.map((c) => ({ ...c, isDemo: true })));
  console.log(`[seed] content: ${data.testimonials.length} testimonials, ${data.stories.length} stories, ${data.faqs.length} FAQs, ${data.coupons.length} coupons`);
}

async function seedSettings() {
  const settings = await Settings.getSettings();
  settings.homepage.hero.image = MEDIA.hero.desktop;
  settings.homepage.hero.mobileImage = MEDIA.hero.mobile;
  settings.homepage.storyImage = MEDIA.editorial.story;
  settings.boutique.image = MEDIA.editorial.boutique;
  settings.seo.ogImage = MEDIA.hero.desktop;
  settings.contact.whatsapp = env.whatsappNumber;
  settings.markModified('homepage');
  settings.markModified('boutique');
  settings.markModified('seo');
  settings.markModified('contact');
  await settings.save();
  console.log('[seed] settings initialised');
}

async function seedInventoryHistory(products) {
  const logs = products.slice(0, 10).map((p) => ({
    product: p._id,
    variantId: p.variants[0]?._id || null,
    sku: p.variants[0]?.sku || p.sku,
    previousStock: 0,
    adjustment: p.variants[0]?.stock ?? p.stock,
    newStock: p.variants[0]?.stock ?? p.stock,
    reason: 'seed',
    note: 'Opening stock',
    performedBy: 'seeder',
    isDemo: true,
  }));
  await InventoryLog.insertMany(logs);
  console.log(`[seed] inventory history: ${logs.length} opening entries`);
}

async function run() {
  await connectDatabase();
  if (fresh) await wipe();

  const existing = await Product.countDocuments();
  if (existing > 0 && !fresh) {
    console.log(`[seed] ${existing} products already exist — run with --fresh to reseed. Nothing to do.`);
    await disconnectDatabase();
    return;
  }

  const { customers } = await seedUsers();
  const { products } = await seedCatalogue();
  const orders = await seedOrders(customers, products);
  await seedReviews(customers, products, orders);
  await seedContent();
  await seedInventoryHistory(products);
  await seedSettings();

  console.log('\n[seed] done.');
  console.log(`[seed] admin    → ${env.seedAdminEmail} / ${env.seedAdminPassword}`);
  console.log(`[seed] customer → ${env.seedCustomerEmail} / ${env.seedCustomerPassword}`);

  await disconnectDatabase();
}

run().catch(async (err) => {
  console.error('[seed] failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
