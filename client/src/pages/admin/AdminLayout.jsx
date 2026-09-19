import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Package, Tags, Boxes, ShoppingBag, Users, Ticket, Star,
  Quote, Film, Image, HelpCircle, Settings, LogOut, Menu, X, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const GROUPS = [
  {
    label: 'Overview',
    links: [{ to: '/admin', label: 'Dashboard', Icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Catalogue',
    links: [
      { to: '/admin/products', label: 'Products', Icon: Package },
      { to: '/admin/categories', label: 'Categories', Icon: Tags },
      { to: '/admin/inventory', label: 'Inventory', Icon: Boxes },
    ],
  },
  {
    label: 'Commerce',
    links: [
      { to: '/admin/orders', label: 'Orders', Icon: ShoppingBag },
      { to: '/admin/customers', label: 'Customers', Icon: Users },
      { to: '/admin/coupons', label: 'Coupons', Icon: Ticket },
      { to: '/admin/reviews', label: 'Reviews', Icon: Star },
    ],
  },
  {
    label: 'Content',
    links: [
      { to: '/admin/testimonials', label: 'Testimonials', Icon: Quote },
      { to: '/admin/stories', label: 'Stories', Icon: Film },
      { to: '/admin/banners', label: 'Banners', Icon: Image },
      { to: '/admin/faqs', label: 'FAQs', Icon: HelpCircle },
    ],
  },
  {
    label: 'Configuration',
    links: [{ to: '/admin/settings', label: 'Settings', Icon: Settings }],
  },
];

function SidebarContent({ onNavigate }) {
  return (
    <nav aria-label="Admin sections" className="flex h-full flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <Link
          to="/admin"
          onClick={onNavigate}
          className="font-[var(--font-display)] text-xl font-light tracking-[0.28em] text-white"
        >
          AARAVA
        </Link>
        <p className="eyebrow-sm mt-1.5 text-white/35">Administration</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {GROUPS.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-2.5 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-white/30">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.links.map(({ to, label, Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) => `flex items-center gap-3 px-2.5 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-white/12 text-white'
                        : 'text-white/60 hover:bg-white/6 hover:text-white'
                    }`}
                  >
                    <Icon size={15} strokeWidth={1.5} aria-hidden="true" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 p-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-2.5 py-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ExternalLink size={15} strokeWidth={1.5} aria-hidden="true" />
          View storefront
        </a>
      </div>
    </nav>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const signOut = () => {
    logout();
    toast.success('Signed out.');
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-svh bg-[var(--background)] lg:grid lg:grid-cols-[15rem_1fr]">
      {/* --------------------------------------------------- desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh bg-[var(--primary-dark)] lg:block">
        <SidebarContent />
      </aside>

      {/* ---------------------------------------------------- mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-[rgba(21,41,31,0.55)]"
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="absolute inset-y-0 left-0 w-[17rem] max-w-[82vw] bg-[var(--primary-dark)]"
            >
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 grid h-9 w-9 place-items-center text-white/60 hover:text-white"
              >
                <X size={19} />
              </button>
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-col">
        {/* ------------------------------------------------------- top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="icon-btn lg:hidden"
            >
              <Menu size={19} />
            </button>
            <span className="font-[var(--font-display)] text-lg font-light tracking-[0.24em] lg:hidden">
              AARAVA
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium leading-tight">{user?.name}</p>
              <p className="text-[0.6875rem] leading-tight text-[var(--text-muted)]">Administrator</p>
            </div>
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-xs text-[var(--text-inverse)]"
              aria-hidden="true"
            >
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </span>
            <button type="button" onClick={signOut} className="icon-btn" aria-label="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
