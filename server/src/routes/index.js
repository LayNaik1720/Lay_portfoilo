import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { attachUser, requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as schemas from '../validators/schemas.js';

import * as auth from '../controllers/authController.js';
import * as products from '../controllers/productController.js';
import * as cart from '../controllers/cartController.js';
import * as orders from '../controllers/orderController.js';
import * as content from '../controllers/contentController.js';
import * as inventory from '../controllers/inventoryController.js';
import * as reviews from '../controllers/reviewController.js';
import * as wishlist from '../controllers/wishlistController.js';
import * as coupons from '../controllers/couponController.js';
import * as customers from '../controllers/customerController.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: env.rateLimitWindowMinutes * 60 * 1000,
  max: env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again shortly.' },
});

router.use(attachUser);

router.get('/health', (_req, res) => res.json({
  success: true,
  data: { status: 'ok', uptime: process.uptime(), environment: env.nodeEnv },
}));

// ---------------------------------------------------------------- auth ------
router.post('/auth/register', authLimiter, validate(schemas.registerSchema), auth.register);
router.post('/auth/login', authLimiter, validate(schemas.loginSchema), auth.login);
router.post('/auth/admin/login', authLimiter, validate(schemas.loginSchema), auth.adminLogin);
router.get('/auth/me', requireAuth, auth.me);
router.patch('/auth/profile', requireAuth, validate(schemas.updateProfileSchema), auth.updateProfile);
router.post('/auth/change-password', requireAuth, validate(schemas.changePasswordSchema), auth.changePassword);

router.get('/auth/addresses', requireAuth, auth.listAddresses);
router.post('/auth/addresses', requireAuth, validate(schemas.addressSchema), auth.addAddress);
router.put('/auth/addresses/:id', requireAuth, validate(schemas.addressSchema.partial()), auth.updateAddress);
router.delete('/auth/addresses/:id', requireAuth, auth.deleteAddress);

// ------------------------------------------------------------ storefront ----
router.get('/storefront/config', content.getStorefrontConfig);
router.get('/categories', content.listPublicCategories);
router.get('/categories/:slug', content.getCategoryBySlug);
router.get('/collections', content.listPublicCollections);
router.get('/testimonials', content.listPublicTestimonials);
router.get('/stories', content.listPublicStories);
router.get('/faqs', content.listPublicFaqs);
router.get('/banners', content.listPublicBanners);

// -------------------------------------------------------------- products ----
router.get('/products', validate(schemas.productQuerySchema, 'query'), products.listProducts);
router.get('/products/filters', products.getFilterOptions);
router.get('/products/suggestions', products.searchSuggestions);
router.get('/products/best-sellers', products.getBestSellers);
router.get('/products/recent-purchases', products.getRecentPurchases);
router.get('/products/by-id/:id', products.getProductById);
router.get('/products/:slug', products.getProductBySlug);
router.get('/products/:slug/reviews', reviews.listProductReviews);

// ------------------------------------------------------------------ cart ----
router.post('/cart/quote', validate(schemas.guestCartSchema), cart.quoteGuestCart);
router.get('/cart', requireAuth, cart.getCart);
router.post('/cart/items', requireAuth, validate(schemas.addToCartSchema), cart.addToCart);
router.patch('/cart/items/:itemId', requireAuth, validate(schemas.updateCartItemSchema), cart.updateCartItem);
router.delete('/cart/items/:itemId', requireAuth, cart.removeCartItem);
router.delete('/cart', requireAuth, cart.clearCart);
router.post('/cart/coupon', requireAuth, cart.applyCoupon);
router.delete('/cart/coupon', requireAuth, cart.removeCoupon);

// --------------------------------------------------------------- coupons ----
router.post('/coupons/validate', coupons.checkCoupon);

// ---------------------------------------------------------------- orders ----
router.post('/orders', validate(schemas.placeOrderSchema), orders.placeOrder);
router.post('/orders/verify-payment', validate(schemas.verifyPaymentSchema), orders.verifyPayment);
router.post('/orders/:id/simulate-payment', orders.simulatePayment);
router.get('/orders/number/:orderNumber', orders.getOrderByNumber);
router.get('/orders/mine', requireAuth, orders.listMyOrders);
router.get('/orders/:id', requireAuth, orders.getMyOrder);
router.post('/orders/:id/cancel', requireAuth, orders.cancelMyOrder);
router.post('/orders/:id/return', requireAuth, orders.requestReturn);

// -------------------------------------------------------------- wishlist ----
router.get('/wishlist', requireAuth, wishlist.getWishlist);
router.post('/wishlist', requireAuth, wishlist.addToWishlist);
router.delete('/wishlist/:productId', requireAuth, wishlist.removeFromWishlist);

// --------------------------------------------------------------- reviews ----
router.post('/reviews', requireAuth, validate(schemas.reviewSchema), reviews.createReview);
router.get('/reviews/mine', requireAuth, reviews.listMyReviews);
router.get('/reviews/reviewable', requireAuth, reviews.reviewableProducts);

// =============================================================== ADMIN =======
const admin = Router();
admin.use(requireAuth, requireAdmin);

admin.get('/dashboard', orders.adminDashboard);

admin.get('/products', products.adminListProducts);
admin.post('/products', validate(schemas.productSchema), products.createProduct);
admin.get('/products/:id', products.adminGetProduct);
admin.put('/products/:id', validate(schemas.productUpdateSchema), products.updateProduct);
admin.delete('/products/:id', products.deleteProduct);

admin.get('/categories', content.categoryCrud.list);
admin.post('/categories', validate(schemas.categorySchema), content.categoryCrud.create);
admin.get('/categories/:id', content.categoryCrud.get);
admin.put('/categories/:id', validate(schemas.categorySchema.partial()), content.categoryCrud.update);
admin.delete('/categories/:id', content.categoryCrud.remove);

admin.get('/collections', content.collectionCrud.list);
admin.post('/collections', content.collectionCrud.create);
admin.put('/collections/:id', content.collectionCrud.update);
admin.delete('/collections/:id', content.collectionCrud.remove);

admin.get('/inventory', inventory.listInventory);
admin.get('/inventory/history', inventory.inventoryHistory);
admin.post('/inventory/:productId/adjust', validate(schemas.inventoryAdjustSchema), inventory.adjustInventory);
admin.post('/inventory/:productId/set', validate(schemas.inventorySetSchema), inventory.setInventory);

admin.get('/orders', orders.adminListOrders);
admin.get('/orders/:id', orders.adminGetOrder);
admin.put('/orders/:id/status', validate(schemas.orderStatusSchema), orders.adminUpdateOrderStatus);
admin.patch('/orders/:id', orders.adminUpdateOrder);

admin.get('/customers', customers.adminListCustomers);
admin.get('/customers/:id', customers.adminGetCustomer);
admin.patch('/customers/:id/status', customers.adminToggleCustomer);

admin.get('/coupons', coupons.adminListCoupons);
admin.post('/coupons', validate(schemas.couponSchema), coupons.adminCreateCoupon);
admin.put('/coupons/:id', validate(schemas.couponSchema.partial()), coupons.adminUpdateCoupon);
admin.delete('/coupons/:id', coupons.adminDeleteCoupon);

admin.get('/reviews', reviews.adminListReviews);
admin.patch('/reviews/:id', reviews.adminModerateReview);
admin.delete('/reviews/:id', reviews.adminDeleteReview);

admin.get('/testimonials', content.testimonialCrud.list);
admin.post('/testimonials', validate(schemas.testimonialSchema), content.testimonialCrud.create);
admin.put('/testimonials/:id', validate(schemas.testimonialSchema.partial()), content.testimonialCrud.update);
admin.delete('/testimonials/:id', content.testimonialCrud.remove);

admin.get('/stories', content.storyCrud.list);
admin.post('/stories', validate(schemas.storySchema), content.storyCrud.create);
admin.put('/stories/:id', validate(schemas.storySchema.partial()), content.storyCrud.update);
admin.delete('/stories/:id', content.storyCrud.remove);

admin.get('/banners', content.bannerCrud.list);
admin.post('/banners', validate(schemas.bannerSchema), content.bannerCrud.create);
admin.put('/banners/:id', validate(schemas.bannerSchema.partial()), content.bannerCrud.update);
admin.delete('/banners/:id', content.bannerCrud.remove);

admin.get('/faqs', content.faqCrud.list);
admin.post('/faqs', validate(schemas.faqSchema), content.faqCrud.create);
admin.put('/faqs/:id', validate(schemas.faqSchema.partial()), content.faqCrud.update);
admin.delete('/faqs/:id', content.faqCrud.remove);

admin.get('/settings', content.getSettings);
admin.put('/settings', content.updateSettings);

router.use('/admin', admin);

export default router;
