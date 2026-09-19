/**
 * Payment provider abstraction.
 *
 * The default "mock" provider simulates a gateway so the whole checkout flow is
 * exercisable in development. Swapping in Razorpay only requires implementing
 * the same three methods with the real SDK — the secret key never leaves the
 * server and signature verification always happens here.
 */
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

function hmac(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

const mockProvider = {
  name: 'mock',

  /** Create a provider-side order and return what the client needs. */
  async createPaymentOrder({ amount, currency = 'INR', receipt }) {
    const orderId = `mock_order_${crypto.randomBytes(8).toString('hex')}`;
    return {
      provider: 'mock',
      orderId,
      amount: Math.round(amount * 100),
      currency,
      receipt,
      keyId: env.paymentKeyId || 'mock_key_id',
    };
  },

  /**
   * Verify the signature returned by the client.
   * Mirrors Razorpay's `HMAC_SHA256(order_id + "|" + payment_id, secret)`.
   */
  verifySignature({ orderId, paymentId, signature }) {
    const secret = env.paymentKeySecret || 'mock_secret';
    const expected = hmac(secret, `${orderId}|${paymentId}`);
    return crypto.timingSafeEqual(
      Buffer.from(expected.padEnd(64, '0').slice(0, 64)),
      Buffer.from(String(signature || '').padEnd(64, '0').slice(0, 64)),
    );
  },

  /** Development helper: produce the signature a real gateway would send. */
  signForTesting({ orderId, paymentId }) {
    return hmac(env.paymentKeySecret || 'mock_secret', `${orderId}|${paymentId}`);
  },
};

const razorpayProvider = {
  name: 'razorpay',
  async createPaymentOrder() {
    // Integration point: instantiate the Razorpay SDK with env.paymentKeyId /
    // env.paymentKeySecret and call orders.create(). Left unwired so no real
    // credentials are ever required to run this project.
    throw ApiError.internal('Razorpay is not configured. Set PAYMENT_PROVIDER=mock or wire up the SDK.');
  },
  verifySignature({ orderId, paymentId, signature }) {
    const expected = hmac(env.paymentKeySecret, `${orderId}|${paymentId}`);
    return expected === signature;
  },
};

const providers = { mock: mockProvider, razorpay: razorpayProvider };

export function getPaymentProvider() {
  return providers[env.paymentProvider] || mockProvider;
}

export const paymentService = {
  createPaymentOrder: (...args) => getPaymentProvider().createPaymentOrder(...args),
  verifySignature: (...args) => getPaymentProvider().verifySignature(...args),
  signForTesting: (...args) => mockProvider.signForTesting(...args),
  get providerName() { return getPaymentProvider().name; },
};
