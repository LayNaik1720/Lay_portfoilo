import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { buildSitemap, buildRobots } from './services/seoService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  }));

  // Allow the configured client plus sandbox/preview hosts.
  const allowedOrigins = new Set([env.clientUrl, ...env.corsExtraOrigins]);
  app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      // Preview environments expose dynamic subdomains.
      if (/\.e2b\.app$/.test(new URL(origin).hostname)) return callback(null, true);
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  }));

  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (!env.isProduction) app.use(morgan('dev'));

  app.use(rateLimit({
    windowMs: env.rateLimitWindowMinutes * 60 * 1000,
    max: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
  }));

  app.use('/uploads', express.static(path.resolve(__dirname, '..', env.uploadDir), { maxAge: '7d' }));

  app.use('/api', routes);

  // SEO endpoints are served from the API so they always reflect live data.
  app.get('/sitemap.xml', async (_req, res, next) => {
    try {
      res.type('application/xml').send(await buildSitemap());
    } catch (err) { next(err); }
  });
  app.get('/robots.txt', (_req, res) => res.type('text/plain').send(buildRobots()));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
