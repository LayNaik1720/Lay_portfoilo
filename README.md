# AARAVA — Boutique Fashion E-Commerce

A complete, production-shaped full-stack e-commerce application for a handcrafted
clothing boutique. Not a mockup: every button calls a real API, every number comes
out of the database, and the admin dashboard genuinely writes to it.

Two experiences share one codebase:

| Experience | URL | Description |
|---|---|---|
| **Storefront** | `/` | Editorial, image-led shopping for customers |
| **Admin** | `/admin` | Password-protected dashboard for the boutique owner |

---

## Table of contents

- [Stack](#stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Demo credentials](#demo-credentials)
- [Project layout](#project-layout)
- [The database story](#the-database-story)
- [Design system](#design-system)
- [Features](#features)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Security](#security)
- [Testing](#testing)
- [Deploying](#deploying)

---

## Stack

**Frontend** — React 18, Vite 5, React Router 6, Tailwind CSS v4, Framer Motion 11,
lucide-react, self-hosted Cormorant Garamond + Inter.

**Backend** — Node.js, Express 4, Mongoose 8, MongoDB, zod validation, JWT auth,
bcrypt hashing, helmet, CORS, rate limiting, compression, morgan.

---

## Quick start

You need **Node.js 18+** and a MongoDB instance (see
[The database story](#the-database-story) if you don't have one).

### 1. Backend

```bash
cd server
npm install
cp .env.example .env        # then edit MONGODB_URI and JWT_SECRET
npm run seed -- --fresh     # wipes demo data and reseeds
npm run dev                 # http://localhost:4000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```

The Vite dev server proxies `/api`, `/uploads`, `/sitemap.xml` and `/robots.txt`
to `http://127.0.0.1:4000`, so the browser only ever talks to one origin and no
API base URL needs to be baked into the frontend bundle.

Open <http://localhost:5173> for the storefront and
<http://localhost:5173/admin/login> for the dashboard.

---

## Environment variables

Everything configurable lives in `server/.env` — start from `server/.env.example`.
**No secret is ever read by the React app.**

| Variable | Purpose | Default |
|---|---|---|
| `NODE_ENV` | `development` / `production` | `development` |
| `PORT` | API port | `4000` |
| `MONGODB_URI` | Mongo connection string | `mongodb://127.0.0.1:27017/aarava` |
| `JWT_SECRET` | Token signing secret — **change this** | — |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `BCRYPT_SALT_ROUNDS` | Password hashing cost | `10` |
| `CLIENT_URL` | Storefront origin, used for CORS + SEO URLs | `http://localhost:5173` |
| `SERVER_URL` | Public API origin, used in the sitemap | `http://localhost:4000` |
| `CORS_EXTRA_ORIGINS` | Comma-separated extra allowed origins | — |
| `PAYMENT_KEY_ID` | Gateway public key (Razorpay-shaped) | — |
| `PAYMENT_KEY_SECRET` | Gateway secret — **server only** | — |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Credentials created by the seeder | see below |
| `WHATSAPP_NUMBER` | Default WhatsApp contact (digits + country code) | `919876543210` |
| `GOOGLE_MAPS_API_KEY` | Optional — the store map works without it | — |
| `GOOGLE_MAPS_QUERY` | Boutique map search string | Surat, Gujarat |
| `UPLOAD_DIR` | Where uploaded images are written | `uploads` |
| `MAX_UPLOAD_SIZE_MB` | Upload cap | `5` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Rate limiter tuning | `900000` / `300` |

Most *business* settings — free-shipping threshold, shipping charge, COD on/off,
return window, all homepage copy, popups, boutique address, SEO defaults — are
**not** environment variables. They live in the `Settings` document and are edited
at `/admin/settings` without a redeploy.

---

## Demo credentials

Created by `npm run seed`:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@aarava.com` | `Admin@12345` |
| Customer | `priya@example.com` | `Customer@123` |

Other seeded customers use the pattern `<FirstName>@12345`.

> Every seeded record carries `isDemo: true`. `npm run seed -- --fresh` deletes
> **only** demo records, so demo content can be cleared without touching real
> orders, customers or products.

---

## Project layout

```
.
├── client/                     React + Vite storefront and admin
│   ├── public/images/          Committed editorial photography
│   └── src/
│       ├── components/         Reusable UI (Navbar, ProductCard, CartDrawer…)
│       │   ├── admin/          Admin primitives (AdminTable, AdminDrawer…)
│       │   ├── home/           Homepage sections
│       │   └── ui/             Design-system primitives
│       ├── context/            Auth, Cart, Wishlist, Storefront, Toast
│       ├── hooks/              useFetch, useDebounced, useSeo
│       ├── lib/                API client, formatters
│       ├── pages/              Route components
│       │   ├── account/        Customer dashboard
│       │   └── admin/          Admin dashboard
│       └── styles/theme.css    ← single source of design truth
│
├── server/                     Express REST API
│   ├── src/
│   │   ├── config/             env + database connection
│   │   ├── controllers/        HTTP layer only
│   │   ├── middleware/         auth, validation, error handling
│   │   ├── models/             12 Mongoose schemas
│   │   ├── routes/             route table
│   │   ├── seed/               demo data + central media registry
│   │   ├── services/           business logic (orders, inventory, pricing…)
│   │   ├── utils/              ApiError, asyncHandler
│   │   └── validators/         zod schemas
│   └── test/api.test.mjs       97 end-to-end API assertions
│
└── devdb/                      Embedded MongoDB-compatible dev server
```

Business logic lives in `services/`, never in routes. Controllers translate HTTP
to service calls and back.

---

## The database story

The app talks to MongoDB through Mongoose in the completely ordinary way — point
`MONGODB_URI` at a local `mongod` or a MongoDB Atlas cluster and it just works.

`devdb/` is a small MongoDB **wire-protocol-compatible** server written for this
project, for environments where installing `mongod` isn't possible. It speaks
enough of the OP_MSG protocol for Mongoose (CRUD, indexes, aggregation pipelines,
cursors) and persists to disk under `devdb/data/`.

```bash
cd devdb && npm install && npm start     # listens on 127.0.0.1:27017
```

It is a **development convenience only**. For production, use real MongoDB:

```bash
MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/aarava"
```

No application code changes between the two.

---

## Design system

**All colour, type and spacing tokens live in `client/src/styles/theme.css`.**
Components reference `var(--token)` and never hard-code a hex value, so rebranding
is a single-file edit.

| Token | Role |
|---|---|
| `--primary` / `--primary-dark` | Deep forest green |
| `--secondary` | Warm beige |
| `--background` / `--surface` / `--surface-muted` | Ivory, cream, sand |
| `--text` / `--text-muted` / `--text-inverse` | Type colours |
| `--border` / `--border-strong` | Thin editorial rules |
| `--accent` / `--accent-soft` | Terracotta / muted rose |
| `--gold` | Subtle metallic highlight |
| `--success` / `--error` / `--warning` | Status colours |
| `--sale` | Sale pricing |

Typography pairs **Cormorant Garamond** (display) with **Inter** (UI), both
self-hosted via `@fontsource`. A fluid scale (`.display-hero` → `.display-sm`,
`.eyebrow`) keeps headings proportional from 360px to 1920px.

### Responsive approach

Layouts are re-composed per breakpoint, not shrunk: a compact navbar with a slide
drawer, a portrait hero crop, two-column product grids, swipeable carousels, a
filter drawer instead of a sidebar, admin tables that become labelled cards below
`md`, and touch targets of at least 44px. Tested at 360 / 375 / 390 / 414 / 768 /
1024 / 1280 / 1440 / 1920 with no horizontal overflow.

### Motion

Framer Motion handles reveals, drawers and page transitions. A global
`prefers-reduced-motion` rule in `theme.css` disables animation for visitors who
ask for it.

---

## Features

### Storefront

- **Cinematic hero** with admin-editable eyebrow, heading, copy and buttons
- **Promo strip** — discount, free-shipping threshold, returns, WhatsApp
- **First-visit welcome popup** wired to a real coupon, dismissal remembered in `localStorage`
- **Shop by collection** asymmetric editorial grid with per-category tile sizing
- **New arrivals**, **Sale** and **Best sellers** — best sellers are aggregated
  from actual order line items; nothing is fabricated
- **Brand story** with parallax, **featured stories/reels**, **testimonials**
- **Recent purchase notices** built from genuine recent orders, showing only a
  product and city — never a name, email or address — toggleable in admin
- **Search** across name, SKU, category, tags and collection with live suggestions
- **Filtering** by category, price, size, colour, fabric, collection, availability
  and discount; **sorting** by newest, price, popularity, best selling, rating, name
- **Product pages** with gallery, variant selection, stock state, verified-purchase
  reviews, structured data and an "Ask about this product" WhatsApp deep link
- **Cart** with a free-shipping progress bar driven by the configured threshold
- **Checkout** with coupons, shipping calculation, COD and an online payment flow
  whose signature is verified server-side only
- **Wishlist**, **account dashboard**, order history, order tracking, addresses
- **Boutique page** with an embedded Google map, **FAQ accordion**, policy pages
- **Floating WhatsApp button** throughout

### Order lifecycle

Twelve statuses — `pending`, `payment_processing`, `payment_confirmed`,
`confirmed`, `packed`, `shipped`, `delivered`, `cancelled`, `return_requested`,
`returned`, `refund_initiated`, `refunded` — with a transition table the API
enforces. The admin UI only ever offers legal next steps, and every change is
appended to the order's status history with a note and an author.

### Inventory

Stock is revalidated immediately before an order is created, deducted when the
order is confirmed, and restored on cancellation or return. Overselling returns
`409` rather than silently going negative. Every movement writes an `InventoryLog`
entry, visible at `/admin/inventory`.

### Admin dashboard

KPIs and a 30-day sales chart; full CRUD for products (with variants, imagery,
SEO), categories, coupons, testimonials, stories, banners and FAQs; inventory
adjustment with reason codes and history; order management; customer profiles with
real lifetime value; review moderation; and a settings screen covering brand,
shipping, payments, contact, boutique, homepage copy, popups and SEO.

### Accessibility & SEO

Semantic landmarks, a skip link, labelled form controls, visible focus rings,
`aria-live` toasts, keyboard-navigable drawers and menus, and alt text everywhere.
Clean slug URLs (`/product/ruhi-handwoven-silk-saree`), per-page titles, meta
descriptions, canonicals, Open Graph and Twitter cards, JSON-LD product and FAQ
structured data, plus generated `/sitemap.xml` and `/robots.txt`.

### Performance

Route-level code splitting, lazy-loaded images with width/height hints, vendor
chunk splitting, skeleton loaders on every async surface, and paginated lists.

---

## API reference

Base path `/api`. List responses are
`{ success, data, meta: { page, limit, total, totalPages } }`;
single responses are `{ success, data }`.

### Public

```
GET    /storefront/config              Settings, categories, collections
GET    /products                       Filter, sort and paginate
GET    /products/filters               Available facets + price range
GET    /products/suggestions?q=        Search autocomplete
GET    /products/best-sellers          Derived from real orders
GET    /products/recent-purchases      Privacy-safe recent order feed
GET    /products/:slug                 Product detail
GET    /products/:slug/reviews         Approved reviews
GET    /categories  /collections  /stories  /testimonials  /faqs  /banners
POST   /cart/quote                     Price a guest cart
POST   /coupons/validate               Check a coupon
POST   /orders                         Place an order
POST   /orders/verify-payment          Server-side signature verification
GET    /orders/number/:orderNumber     Guest lookup (requires matching ?email=)
```

### Authenticated

```
POST   /auth/register  /auth/login  /auth/admin/login
GET    /auth/me
GET    /auth/addresses                 + POST / PUT / DELETE
GET    /cart                           + POST / PUT / DELETE, coupon apply/remove
GET    /wishlist                       + POST / DELETE
GET    /orders/mine  /orders/:id
POST   /orders/:id/cancel  /orders/:id/return
POST   /reviews                        Verified purchases only
GET    /reviews/mine  /reviews/reviewable
```

### Admin (`requireAuth` + `requireAdmin`)

```
GET    /admin/dashboard
CRUD   /admin/products  /admin/categories  /admin/collections
CRUD   /admin/coupons  /admin/testimonials  /admin/stories  /admin/banners  /admin/faqs
GET    /admin/inventory  /admin/inventory/history
POST   /admin/inventory/:productId/adjust   /admin/inventory/:productId/set
GET    /admin/orders  /admin/orders/:id
PUT    /admin/orders/:id/status
PATCH  /admin/orders/:id
GET    /admin/customers  /admin/customers/:id
PATCH  /admin/customers/:id/status
GET    /admin/reviews    PATCH/DELETE /admin/reviews/:id
GET    /admin/settings   PUT /admin/settings
```

---

## Data model

`User`, `Admin` (role on `User`), `Product` (with embedded `ProductVariant`),
`Category`, `Collection`, `Cart`, `Wishlist`, `Order` (with embedded `OrderItem`
snapshots and status history), `Coupon`, `Review`, `Testimonial`, `Story`,
`Banner`, `FAQ`, `InventoryLog`, `Address` (embedded on `User`) and a singleton
`Settings`.

Indexes cover SKU, slug, category, product name (text), order number and customer
email.

Products carry name, slug, SKU, long and short descriptions, price, original
price, category, subcategory, collection, multiple images, sizes, colours, fabric,
material, care instructions, tags, stock, per-variant stock, a low-stock
threshold, `newArrival` / `bestSeller` / `featured` / `isOnSale` flags, status and
timestamps.

Order items are **snapshots** — name, SKU, image and price at purchase time — so
later catalogue edits never rewrite history.

---

## Security

- Passwords hashed with bcrypt; never stored or logged in plain text
- JWT bearer authentication with role-based `requireAuth` / `requireAdmin` guards
- Every write endpoint validated with zod before it reaches a controller
- Payment signatures verified with HMAC-SHA256 **on the server only**; the gateway
  secret never leaves the backend and is not present in the client bundle
- helmet security headers, a CORS allowlist, and rate limiting on the API
- Secrets are read from environment variables; `.env` is gitignored
- Guest order lookup requires the order number *and* the matching email

---

## Testing

```bash
cd server
npm test        # 97 end-to-end assertions against a running API
```

The suite exercises authentication and admin RBAC, catalogue filtering and
sorting, cart and coupon maths, guest quoting, COD and online order placement,
stock deduction, oversell prevention and cancellation restore, payment signature
verification, the full status transition table, inventory adjustments and history,
verified-purchase review rules, admin CRUD, settings-driven pricing, sitemap and
robots output, and JSON 404s.

Point it at another host with `API_BASE=http://host:port/api npm test`.

---

## Deploying

1. Provision MongoDB (Atlas is fine) and set `MONGODB_URI`.
2. Set a strong `JWT_SECRET`, real `PAYMENT_KEY_ID` / `PAYMENT_KEY_SECRET`, and
   the production `CLIENT_URL` / `SERVER_URL`.
3. `cd client && npm run build` → serve `client/dist` from any static host or CDN.
4. `cd server && npm start` behind a process manager.
5. Point the frontend host's `/api` path at the API, or set `CLIENT_URL` so CORS
   allows the deployed origin.
6. Skip the seeder in production, or run it once and remove the demo data — demo
   records are all tagged `isDemo: true`.
