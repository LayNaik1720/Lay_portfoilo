import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, useLocation, Navigate, Outlet } from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { StorefrontProvider } from "./context/StorefrontContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { WishlistProvider } from "./context/WishlistContext.jsx";

import { Navbar } from "./components/Navbar.jsx";
import { Footer } from "./components/Footer.jsx";
import { CartDrawer } from "./components/CartDrawer.jsx";
import {
  WhatsAppButton,
  WelcomePopup,
  RecentPurchaseNotice,
} from "./components/FloatingWidgets.jsx";
import { LoadingSkeleton } from "./components/ui/Primitives.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

import HomePage from "./pages/HomePage.jsx";
import ShopPage from "./pages/ShopPage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import CartPage from "./pages/CartPage.jsx";

// Routes below the fold of the main journey are split out of the initial bundle.
const CheckoutPage = lazy(() => import("./pages/CheckoutPage.jsx"));
const OrderSuccessPage = lazy(() => import("./pages/OrderSuccessPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx"));
const AccountLayout = lazy(() => import("./pages/account/AccountLayout.jsx"));
const AccountOverview = lazy(
  () => import("./pages/account/AccountOverview.jsx"),
);
const AccountOrders = lazy(() => import("./pages/account/AccountOrders.jsx"));
const AccountOrderDetail = lazy(
  () => import("./pages/account/AccountOrderDetail.jsx"),
);
const AccountWishlist = lazy(
  () => import("./pages/account/AccountWishlist.jsx"),
);
const AccountAddresses = lazy(
  () => import("./pages/account/AccountAddresses.jsx"),
);
const AccountReviews = lazy(() => import("./pages/account/AccountReviews.jsx"));

const AboutPage = lazy(() => import("./pages/AboutPage.jsx"));
const StoriesPage = lazy(() => import("./pages/StoriesPage.jsx"));
const ContactPage = lazy(() => import("./pages/ContactPage.jsx"));
const StorePage = lazy(() => import("./pages/StorePage.jsx"));
const FaqPage = lazy(() => import("./pages/FaqPage.jsx"));
const PolicyPage = lazy(() => import("./pages/PolicyPage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));

const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.jsx"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.jsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts.jsx"));
const AdminProductForm = lazy(
  () => import("./pages/admin/AdminProductForm.jsx"),
);
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories.jsx"));
const AdminInventory = lazy(() => import("./pages/admin/AdminInventory.jsx"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders.jsx"));
const AdminOrderDetail = lazy(
  () => import("./pages/admin/AdminOrderDetail.jsx"),
);
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers.jsx"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons.jsx"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews.jsx"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent.jsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.jsx"));

/** Scroll to top on navigation, except when only the query string changes. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant" in window ? "instant" : "auto",
    });
  }, [pathname]);
  return null;
}

function PageFallback() {
  return (
    <div className="shell section">
      <LoadingSkeleton className="mb-6 h-8 w-64" />
      <LoadingSkeleton className="h-64 w-full" />
    </div>
  );
}

/** Gate for signed-in customers. */
function RequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageFallback />;
  if (!isAuthenticated)
    return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

/** Gate for admins — customers are redirected to the admin sign-in. */
function RequireAdmin() {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageFallback />;
  if (!isAdmin)
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  return <Outlet />;
}

/** Customer-facing chrome. */
function StorefrontLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main
        id="main"
        className="flex-1"
        style={{ paddingTop: "var(--header-height)" }}
      >
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
      <WelcomePopup />
      <RecentPurchaseNotice />
    </div>
  );
}

/** Homepage variant: the hero sits under a transparent navbar. */
function StorefrontLayoutFlush() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
      <WelcomePopup />
      <RecentPurchaseNotice />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <StorefrontProvider>
            <WishlistProvider>
              <CartProvider>
                <ScrollToTop />
                <Routes>
                  {/* homepage — hero runs under the navbar */}
                  <Route element={<StorefrontLayoutFlush />}>
                    <Route path="/" element={<HomePage />} />
                  </Route>

                  {/* storefront */}
                  <Route element={<StorefrontLayout />}>
                    <Route path="/shop" element={<ShopPage />} />
                    <Route path="/category/:slug" element={<ShopPage />} />
                    <Route path="/product/:slug" element={<ProductPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route
                      path="/order-success/:orderNumber"
                      element={<OrderSuccessPage />}
                    />

                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/stories" element={<StoriesPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/store" element={<StorePage />} />
                    <Route path="/faq" element={<FaqPage />} />
                    <Route
                      path="/shipping-policy"
                      element={<PolicyPage kind="shipping" />}
                    />
                    <Route
                      path="/returns"
                      element={<PolicyPage kind="returns" />}
                    />
                    <Route
                      path="/privacy"
                      element={<PolicyPage kind="privacy" />}
                    />
                    <Route
                      path="/terms"
                      element={<PolicyPage kind="terms" />}
                    />

                    {/* account */}
                    <Route element={<RequireAuth />}>
                      <Route path="/account" element={<AccountLayout />}>
                        <Route index element={<AccountOverview />} />
                        <Route path="orders" element={<AccountOrders />} />
                        <Route
                          path="orders/:id"
                          element={<AccountOrderDetail />}
                        />
                        <Route path="wishlist" element={<AccountWishlist />} />
                        <Route
                          path="addresses"
                          element={<AccountAddresses />}
                        />
                        <Route path="reviews" element={<AccountReviews />} />
                      </Route>
                    </Route>

                    <Route path="*" element={<NotFoundPage />} />
                  </Route>

                  {/* admin — entirely separate chrome */}
                  <Route
                    path="/admin/login"
                    element={
                      <Suspense fallback={<PageFallback />}>
                        <AdminLogin />
                      </Suspense>
                    }
                  />
                  <Route element={<RequireAdmin />}>
                    <Route
                      path="/admin"
                      element={
                        <Suspense fallback={<PageFallback />}>
                          <AdminLayout />
                        </Suspense>
                      }
                    >
                      <Route index element={<AdminDashboard />} />
                      <Route path="products" element={<AdminProducts />} />
                      <Route
                        path="products/new"
                        element={<AdminProductForm />}
                      />
                      <Route
                        path="products/:id"
                        element={<AdminProductForm />}
                      />
                      <Route path="categories" element={<AdminCategories />} />
                      <Route path="inventory" element={<AdminInventory />} />
                      <Route path="orders" element={<AdminOrders />} />
                      <Route path="orders/:id" element={<AdminOrderDetail />} />
                      <Route path="customers" element={<AdminCustomers />} />
                      <Route path="coupons" element={<AdminCoupons />} />
                      <Route path="reviews" element={<AdminReviews />} />
                      <Route
                        path="testimonials"
                        element={<AdminContent kind="testimonials" />}
                      />
                      <Route
                        path="stories"
                        element={<AdminContent kind="stories" />}
                      />
                      <Route
                        path="banners"
                        element={<AdminContent kind="banners" />}
                      />
                      <Route
                        path="faqs"
                        element={<AdminContent kind="faqs" />}
                      />
                      <Route path="settings" element={<AdminSettings />} />
                    </Route>
                  </Route>
                </Routes>
              </CartProvider>
            </WishlistProvider>
          </StorefrontProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
