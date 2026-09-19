/**
 * End-to-end API checks against a running server + seeded database.
 * Usage: node test/api.test.mjs
 */
const BASE = process.env.API_BASE || 'http://127.0.0.1:4000/api';

let passed = 0;
let failed = 0;
const fails = [];

function check(label, condition, detail = '') {
  if (condition) { passed += 1; console.log(`  PASS  ${label}`); }
  else { failed += 1; fails.push(label); console.log(`  FAIL  ${label} ${detail}`); }
}

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-json */ }
  return { status: res.status, body: json };
}

console.log('\n--- AUTH ---');
const unique = Date.now();
const email = `test${unique}@example.com`;

let r = await api('/auth/register', { method: 'POST', body: { name: 'Test Buyer', email, password: 'Password@123', mobile: '9999900000' } });
check('register new customer', r.status === 201 && !!r.body.data.token, `${r.status} ${JSON.stringify(r.body?.message)}`);
const token = r.body?.data?.token;

r = await api('/auth/register', { method: 'POST', body: { name: 'Dup', email, password: 'Password@123' } });
check('duplicate email rejected (409)', r.status === 409, String(r.status));

r = await api('/auth/register', { method: 'POST', body: { name: 'X', email: 'bad-email', password: '123' } });
check('validation rejects bad payload (422)', r.status === 422, String(r.status));

r = await api('/auth/login', { method: 'POST', body: { email, password: 'wrongpass' } });
check('wrong password rejected (401)', r.status === 401, String(r.status));

r = await api('/auth/me', { token });
check('GET /auth/me with token', r.status === 200 && r.body.data.user.email === email);

r = await api('/auth/me');
check('GET /auth/me without token → 401', r.status === 401, String(r.status));

console.log('\n--- ADMIN AUTH ---');
r = await api('/auth/admin/login', { method: 'POST', body: { email: 'admin@aarava.com', password: 'Admin@12345' } });
check('admin login succeeds', r.status === 200 && r.body.data.user.role === 'admin', String(r.status));
const adminToken = r.body?.data?.token;

r = await api('/auth/admin/login', { method: 'POST', body: { email, password: 'Password@123' } });
check('customer cannot use admin login (403)', r.status === 403, String(r.status));

r = await api('/admin/dashboard', { token });
check('customer token blocked from admin API (403)', r.status === 403, String(r.status));

r = await api('/admin/dashboard');
check('anonymous blocked from admin API (401)', r.status === 401, String(r.status));

r = await api('/admin/dashboard', { token: adminToken });
check('admin dashboard returns stats', r.status === 200 && typeof r.body.data.sales.total === 'number',
  JSON.stringify(r.body?.data?.sales));
const dash = r.body?.data;
check('dashboard counts products', dash?.products?.total === 18, JSON.stringify(dash?.products));
check('dashboard has best sellers from orders', (dash?.bestSellers?.length || 0) > 0);
check('dashboard daily series present', Array.isArray(dash?.dailySeries) && dash.dailySeries.length > 0);

console.log('\n--- CATALOGUE ---');
r = await api('/products?limit=5&sort=price_asc');
check('sort price ascending', r.status === 200
  && r.body.data.every((p, i, a) => i === 0 || a[i - 1].price <= p.price),
  r.body?.data?.map((p) => p.price).join());

r = await api('/products?category=sarees');
check('filter by category slug', r.body.data.length === 5, `got ${r.body?.data?.length}`);

r = await api('/products?search=banarasi');
check('search by name', r.body.data.length >= 1 && /Banarasi/i.test(r.body.data[0].name));

r = await api('/products?availability=out_of_stock');
check('filter out of stock', r.body.data.length === 1 && r.body.data[0].sku === 'AAR-KUR-004',
  r.body?.data?.map((p) => p.sku).join());

r = await api('/products?minPrice=2000&maxPrice=5000');
check('price range filter', r.body.data.every((p) => p.price >= 2000 && p.price <= 5000),
  r.body?.data?.map((p) => p.price).join());

r = await api('/products?onSale=true');
check('sale filter returns discounted only', r.body.data.every((p) => p.originalPrice > p.price));

r = await api('/products/suggestions?q=saree');
check('search suggestions', (r.body.data.products?.length || 0) > 0);

r = await api('/products/does-not-exist');
check('unknown product → 404', r.status === 404, String(r.status));

console.log('\n--- WISHLIST ---');
const prodRes = await api('/products?limit=3');
const p1 = prodRes.body.data[0];
const p2 = prodRes.body.data[1];

r = await api('/wishlist', { method: 'POST', token, body: { productId: p1.id || p1._id } });
check('add to wishlist', r.status === 201 && r.body.data.length === 1, String(r.status));
r = await api('/wishlist', { method: 'POST', token, body: { productId: p1.id || p1._id } });
check('wishlist dedupes', r.body.data.length === 1, String(r.body?.data?.length));
r = await api(`/wishlist/${p1.id || p1._id}`, { method: 'DELETE', token });
check('remove from wishlist', r.body.data.length === 0);

console.log('\n--- CART ---');
// Pick a product with a known in-stock variant.
const detail = await api('/products/ruhi-handwoven-silk-saree');
const ruhi = detail.body.data.product;
const variant = ruhi.variants.find((v) => v.stock > 0);

r = await api('/cart/items', { method: 'POST', token, body: { productId: ruhi._id, variantId: variant._id, quantity: 2 } });
check('add to cart', r.status === 201 && r.body.data.items.length === 1, JSON.stringify(r.body?.message));
check('cart line total correct', r.body.data.items[0].lineTotal === ruhi.price * 2,
  `${r.body?.data?.items?.[0]?.lineTotal} vs ${ruhi.price * 2}`);
check('free shipping unlocked above threshold', r.body.data.totals.shippingFee === 0
  && r.body.data.totals.qualifiesForFreeShipping);

const itemId = r.body.data.items[0].id;
r = await api(`/cart/items/${itemId}`, { method: 'PATCH', token, body: { quantity: 3 } });
check('update cart quantity', r.body.data.items[0].quantity === 3);

// Request more than the variant holds (but within the per-request max) so the
// stock guard is what rejects it, not payload validation.
r = await api('/cart/items', { method: 'POST', token, body: { productId: ruhi._id, variantId: variant._id, quantity: 20 } });
check('cannot exceed available stock (409)', r.status === 409, `${r.status} ${JSON.stringify(r.body?.message)}`);

r = await api('/cart/items', { method: 'POST', token, body: { productId: ruhi._id, variantId: variant._id, quantity: 999 } });
check('quantity above per-order max rejected (422)', r.status === 422, String(r.status));

console.log('\n--- COUPONS ---');
r = await api('/cart/coupon', { method: 'POST', token, body: { code: 'WELCOME10' } });
check('apply WELCOME10', r.status === 200 && r.body.data.totals.discount > 0,
  JSON.stringify(r.body?.message || r.body?.data?.totals));
const expectedDiscount = Math.min(Math.round(r.body.data.totals.subtotal * 0.1), 2000);
check('10% discount computed correctly', r.body.data.totals.discount === expectedDiscount,
  `${r.body?.data?.totals?.discount} vs ${expectedDiscount}`);

r = await api('/cart/coupon', { method: 'POST', token, body: { code: 'NOTREAL' } });
check('invalid coupon rejected', r.status === 400, String(r.status));

r = await api('/coupons/validate', { method: 'POST', body: { code: 'FLAT500', subtotal: 1000 } });
check('coupon below min order rejected', r.status === 400, String(r.status));

r = await api('/coupons/validate', { method: 'POST', body: { code: 'FLAT500', subtotal: 5000 } });
check('coupon above min order accepted', r.status === 200 && r.body.data.discount === 500);

r = await api('/cart/coupon', { method: 'DELETE', token });
check('remove coupon', r.body.data.totals.discount === 0);

console.log('\n--- GUEST QUOTE ---');
r = await api('/cart/quote', { method: 'POST', body: { items: [{ productId: ruhi._id, variantId: variant._id, quantity: 1 }] } });
check('guest cart quote prices server-side', r.status === 200 && r.body.data.totals.subtotal === ruhi.price);

console.log('\n--- ORDER + INVENTORY ---');
// Capture stock before ordering.
let before = await api(`/products/${ruhi.slug}`);
const variantBefore = before.body.data.product.variants.find((v) => v._id === variant._id).stock;

const orderPayload = {
  customer: { name: 'Test Buyer', email, mobile: '9999900000' },
  items: [{ productId: ruhi._id, variantId: variant._id, quantity: 2 }],
  shippingAddress: {
    fullName: 'Test Buyer', mobile: '9999900000', house: '12B Rivergate',
    street: 'Athwalines Road', area: 'Athwalines', city: 'Surat',
    state: 'Gujarat', pincode: '395007', country: 'India',
  },
  paymentMethod: 'cod',
  couponCode: 'WELCOME10',
};

r = await api('/orders', { method: 'POST', token, body: orderPayload });
check('place COD order', r.status === 201 && !!r.body.data.order.orderNumber,
  `${r.status} ${JSON.stringify(r.body?.message)}`);
const order = r.body?.data?.order;
check('order applied coupon discount', order?.discount > 0, String(order?.discount));
check('COD order starts confirmed', order?.status === 'confirmed', order?.status);
check('order total = subtotal - discount + shipping',
  order?.total === order?.subtotal - order?.discount + order?.shippingFee,
  `${order?.total} vs ${order?.subtotal}-${order?.discount}+${order?.shippingFee}`);

let after = await api(`/products/${ruhi.slug}`);
const variantAfter = after.body.data.product.variants.find((v) => v._id === variant._id).stock;
check('stock deducted on confirmed order', variantAfter === variantBefore - 2,
  `before ${variantBefore} after ${variantAfter}`);

r = await api('/cart', { token });
check('cart cleared after order', r.body.data.items.length === 0);

r = await api(`/orders/number/${order.orderNumber}`);
check('order lookup without email is refused', r.status === 403);

r = await api(`/orders/number/${order.orderNumber}?email=${encodeURIComponent(order.customer.email)}`);
check('guest order lookup with matching email', r.status === 200 && r.body.data.order.orderNumber === order.orderNumber);
check('order tracker steps present', Array.isArray(r.body.data.tracker) && r.body.data.tracker.length === 6);

r = await api('/orders/mine', { token });
check('list my orders', r.status === 200 && r.body.data.length === 1);

console.log('\n--- OVERSELL PROTECTION ---');
const kurti = (await api('/products/dhara-khadi-kurti')).body.data.product;
r = await api('/orders', {
  method: 'POST',
  token,
  body: {
    ...orderPayload,
    couponCode: '',
    items: [{ productId: kurti._id, variantId: kurti.variants[0]._id, quantity: 1 }],
  },
});
check('cannot order out-of-stock product', r.status === 409 || r.status === 400,
  `${r.status} ${JSON.stringify(r.body?.message)}`);

console.log('\n--- ADMIN ORDER MANAGEMENT ---');
r = await api(`/admin/orders/${order._id}/status`, { method: 'PUT', token: adminToken, body: { status: 'packed', note: 'Packed and ready' } });
check('admin advances order status', r.status === 200 && r.body.data.order.status === 'packed',
  `${r.status} ${JSON.stringify(r.body?.message)}`);

r = await api(`/admin/orders/${order._id}/status`, { method: 'PUT', token: adminToken, body: { status: 'delivered' } });
check('invalid transition packed→delivered rejected', r.status === 400, String(r.status));

r = await api(`/admin/orders/${order._id}/status`, { method: 'PUT', token: adminToken, body: { status: 'shipped', trackingNumber: 'TRK123' } });
check('packed→shipped allowed', r.body.data.order.status === 'shipped' && r.body.data.order.trackingNumber === 'TRK123');

r = await api(`/admin/orders/${order._id}/status`, { method: 'PUT', token: adminToken, body: { status: 'delivered' } });
check('shipped→delivered allowed', r.body.data.order.status === 'delivered');
check('COD marked paid on delivery', r.body.data.order.paymentStatus === 'paid', r.body?.data?.order?.paymentStatus);

console.log('\n--- CANCEL RESTORES STOCK ---');
const order2 = (await api('/orders', {
  method: 'POST', token,
  body: { ...orderPayload, couponCode: '', items: [{ productId: ruhi._id, variantId: variant._id, quantity: 1 }] },
})).body.data.order;

const midStock = (await api(`/products/${ruhi.slug}`)).body.data.product.variants.find((v) => v._id === variant._id).stock;
r = await api(`/orders/${order2._id}/cancel`, { method: 'POST', token, body: { reason: 'Changed my mind' } });
check('customer cancels order', r.status === 200 && r.body.data.order.status === 'cancelled', String(r.status));

const restored = (await api(`/products/${ruhi.slug}`)).body.data.product.variants.find((v) => v._id === variant._id).stock;
check('stock restored after cancellation', restored === midStock + 1, `${midStock} → ${restored}`);

console.log('\n--- ONLINE PAYMENT FLOW ---');
const onlineOrder = (await api('/orders', {
  method: 'POST', token,
  body: { ...orderPayload, couponCode: '', paymentMethod: 'upi', items: [{ productId: ruhi._id, variantId: variant._id, quantity: 1 }] },
})).body;
check('online order created with payment intent', !!onlineOrder.data.payment?.orderId, JSON.stringify(onlineOrder.data?.payment));
check('online order awaits payment', onlineOrder.data.order.status === 'payment_processing', onlineOrder.data.order.status);

const sim = await api(`/orders/${onlineOrder.data.order._id}/simulate-payment`, { method: 'POST' });
check('payment simulation returns signature', !!sim.body.data.signature);

r = await api('/orders/verify-payment', {
  method: 'POST',
  body: { orderId: sim.body.data.orderId, paymentId: sim.body.data.paymentId, signature: 'forged-signature' },
});
check('forged payment signature rejected', r.status === 400, String(r.status));

r = await api('/orders/verify-payment', { method: 'POST', body: sim.body.data });
check('valid payment verified server-side', r.status === 200 && r.body.data.order.paymentStatus === 'paid',
  `${r.status} ${JSON.stringify(r.body?.message)}`);
check('paid order moves to payment_confirmed', r.body.data.order.status === 'payment_confirmed');

console.log('\n--- ADMIN PRODUCT CRUD ---');
const cats = (await api('/categories')).body.data;
r = await api('/admin/products', {
  method: 'POST', token: adminToken,
  body: {
    name: `Test Product ${unique}`, sku: `TEST-${unique}`, price: 1999,
    category: cats[0]._id, shortDescription: 'A test piece', status: 'active',
    variants: [{ sku: `TEST-${unique}-A`, color: 'Ivory', size: 'M', stock: 5 }],
  },
});
check('admin creates product', r.status === 201 && !!r.body.data._id, `${r.status} ${JSON.stringify(r.body?.details || r.body?.message)}`);
const newProduct = r.body?.data;
check('slug auto-generated', !!newProduct?.slug && newProduct.slug.startsWith('test-product'));
check('stock synced from variants', newProduct?.stock === 5, String(newProduct?.stock));

r = await api('/admin/products', { method: 'POST', token: adminToken, body: { name: 'Dup SKU', sku: `TEST-${unique}`, price: 100, category: cats[0]._id } });
check('duplicate SKU rejected', r.status === 409, String(r.status));

r = await api(`/admin/products/${newProduct._id}`, { method: 'PUT', token: adminToken, body: { price: 2499, isFeatured: true } });
check('admin updates product', r.body.data.price === 2499 && r.body.data.isFeatured === true);

console.log('\n--- ADMIN INVENTORY ---');
r = await api('/admin/inventory', { token: adminToken });
check('inventory rows returned', r.status === 200 && r.body.data.length > 0);
check('inventory summary computed', typeof r.body.meta.summary.out_of_stock === 'number',
  JSON.stringify(r.body?.meta?.summary));

r = await api('/admin/inventory?status=out_of_stock', { token: adminToken });
check('filter out-of-stock inventory', r.body.data.every((row) => row.stock <= 0));

r = await api(`/admin/inventory/${newProduct._id}/adjust`, {
  method: 'POST', token: adminToken,
  body: { variantId: newProduct.variants[0]._id, adjustment: 10, reason: 'restock', note: 'New delivery' },
});
check('manual stock adjustment', r.status === 200 && r.body.data.newStock === 15,
  JSON.stringify(r.body?.data));

r = await api(`/admin/inventory/${newProduct._id}/set`, {
  method: 'POST', token: adminToken,
  body: { variantId: newProduct.variants[0]._id, stock: 7 },
});
check('absolute stock set', r.body.data.newStock === 7, JSON.stringify(r.body?.data));

r = await api(`/admin/inventory/history?productId=${newProduct._id}`, { token: adminToken });
check('inventory history recorded', r.body.data.length >= 2, String(r.body?.data?.length));
check('history records reason + delta', r.body.data[0].reason === 'correction' && r.body.data[0].adjustment === -8,
  JSON.stringify(r.body?.data?.[0]));

r = await api(`/admin/products/${newProduct._id}`, { method: 'DELETE', token: adminToken });
check('admin deletes product', r.status === 200);

console.log('\n--- REVIEWS ---');
const reviewProduct = (await api('/products/ruhi-handwoven-silk-saree')).body.data.product;
r = await api('/reviews', { method: 'POST', token, body: { productId: reviewProduct._id, rating: 5, comment: 'Genuinely beautiful weave and true to colour.' } });
check('create review for purchased product', r.status === 201, `${r.status} ${JSON.stringify(r.body?.message)}`);
check('verified purchase badge applied', r.body.data.isVerifiedPurchase === true, JSON.stringify(r.body?.data?.isVerifiedPurchase));

r = await api('/reviews', { method: 'POST', token, body: { productId: reviewProduct._id, rating: 4, comment: 'Second attempt should fail.' } });
check('duplicate review rejected', r.status === 409, String(r.status));

r = await api('/admin/reviews', { token: adminToken });
check('admin lists reviews', r.status === 200 && r.body.data.length > 0);

console.log('\n--- ADMIN CONTENT CRUD ---');
r = await api('/admin/faqs', { method: 'POST', token: adminToken, body: { question: 'Test question?', answer: 'Test answer.' } });
check('create FAQ', r.status === 201, String(r.status));
const faqId = r.body?.data?._id;
r = await api(`/admin/faqs/${faqId}`, { method: 'PUT', token: adminToken, body: { answer: 'Updated answer.' } });
check('update FAQ', r.body.data.answer === 'Updated answer.');
r = await api(`/admin/faqs/${faqId}`, { method: 'DELETE', token: adminToken });
check('delete FAQ', r.status === 200);

r = await api('/admin/testimonials', { method: 'POST', token: adminToken, body: { name: 'Test Person', quote: 'A lovely experience shopping here.', rating: 5 } });
check('create testimonial', r.status === 201);
await api(`/admin/testimonials/${r.body.data._id}`, { method: 'DELETE', token: adminToken });

r = await api('/admin/stories', { method: 'POST', token: adminToken, body: { title: 'Test story', description: 'Behind the scenes' } });
check('create story', r.status === 201);
await api(`/admin/stories/${r.body.data._id}`, { method: 'DELETE', token: adminToken });

console.log('\n--- ADMIN COUPONS ---');
r = await api('/admin/coupons', { method: 'POST', token: adminToken, body: { code: `TEST${unique}`, discountType: 'percentage', discountValue: 25, minOrderValue: 1000 } });
check('create coupon', r.status === 201, `${r.status} ${JSON.stringify(r.body?.details)}`);
const couponId = r.body?.data?._id;
r = await api(`/admin/coupons/${couponId}`, { method: 'PUT', token: adminToken, body: { isActive: false } });
check('deactivate coupon', r.body.data.isActive === false);
r = await api('/coupons/validate', { method: 'POST', body: { code: `TEST${unique}`, subtotal: 5000 } });
check('inactive coupon rejected', r.status === 400, String(r.status));
await api(`/admin/coupons/${couponId}`, { method: 'DELETE', token: adminToken });

console.log('\n--- ADMIN SETTINGS ---');
r = await api('/admin/settings', { token: adminToken });
check('read settings', r.status === 200 && r.body.data.shipping.freeShippingThreshold === 1000);
r = await api('/admin/settings', { method: 'PUT', token: adminToken, body: { shipping: { freeShippingThreshold: 1500 } } });
check('update shipping threshold', r.body.data.shipping.freeShippingThreshold === 1500);
r = await api('/cart/quote', { method: 'POST', body: { items: [{ productId: ruhi._id, variantId: variant._id, quantity: 1 }] } });
check('settings change affects pricing', r.body.data.totals.freeShippingThreshold === 1500,
  String(r.body?.data?.totals?.freeShippingThreshold));
// restore
await api('/admin/settings', { method: 'PUT', token: adminToken, body: { shipping: { freeShippingThreshold: 1000 } } });
check('settings restored', (await api('/admin/settings', { token: adminToken })).body.data.shipping.freeShippingThreshold === 1000);

console.log('\n--- CUSTOMERS ---');
r = await api('/admin/customers', { token: adminToken });
check('admin lists customers with order stats', r.status === 200 && r.body.data.length >= 4
  && r.body.data.some((c) => c.orderCount > 0), String(r.body?.data?.length));

console.log('\n--- SEO ---');
const sitemap = await fetch(`${BASE.replace('/api', '')}/sitemap.xml`);
const sitemapText = await sitemap.text();
check('sitemap.xml served', sitemap.status === 200 && sitemapText.includes('<urlset'));
check('sitemap contains product URLs', sitemapText.includes('/product/ruhi-handwoven-silk-saree'));
const robots = await fetch(`${BASE.replace('/api', '')}/robots.txt`);
check('robots.txt served', robots.status === 200 && (await robots.text()).includes('Sitemap:'));

console.log('\n--- ERROR HANDLING ---');
r = await api('/nope');
check('unknown route → 404 JSON', r.status === 404 && r.body.success === false);
r = await api('/products/filters');
check('filters endpoint not shadowed by :slug', r.status === 200 && Array.isArray(r.body.data.sizes));

console.log(`\n================  ${passed} passed, ${failed} failed  ================`);
if (fails.length) console.log('Failures:\n - ' + fails.join('\n - '));
process.exit(failed === 0 ? 0 : 1);
