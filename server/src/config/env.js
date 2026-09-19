import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const bool = (v, fallback = false) => {
  if (v === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};
const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 4000),

  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aarava',

  jwtSecret: process.env.JWT_SECRET || 'dev_only_insecure_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  saltRounds: num(process.env.BCRYPT_SALT_ROUNDS, 10),

  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || 'http://localhost:4000',
  corsExtraOrigins: (process.env.CORS_EXTRA_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  paymentProvider: process.env.PAYMENT_PROVIDER || 'mock',
  paymentKeyId: process.env.PAYMENT_KEY_ID || '',
  paymentKeySecret: process.env.PAYMENT_KEY_SECRET || '',
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || '',

  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@aarava.com',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
  seedCustomerEmail: process.env.SEED_CUSTOMER_EMAIL || 'priya@example.com',
  seedCustomerPassword: process.env.SEED_CUSTOMER_PASSWORD || 'Customer@123',

  whatsappNumber: process.env.WHATSAPP_NUMBER || '919876543210',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  googleMapsEmbedQuery: process.env.GOOGLE_MAPS_EMBED_QUERY || 'Aarava Boutique, Surat, Gujarat',

  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadSizeMb: num(process.env.MAX_UPLOAD_SIZE_MB, 5),

  rateLimitWindowMinutes: num(process.env.RATE_LIMIT_WINDOW_MINUTES, 15),
  rateLimitMax: num(process.env.RATE_LIMIT_MAX, 600),
  authRateLimitMax: num(process.env.AUTH_RATE_LIMIT_MAX, 40),

  verboseLogs: bool(process.env.VERBOSE_LOGS, false),
};

if (env.isProduction && env.jwtSecret === 'dev_only_insecure_secret_change_me') {
  throw new Error('JWT_SECRET must be set to a strong value in production.');
}
