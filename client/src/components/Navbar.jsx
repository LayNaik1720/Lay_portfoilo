import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Search, User, Heart, ShoppingBag, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useStorefront } from '../context/StorefrontContext.jsx';
import { SearchOverlay } from './SearchOverlay.jsx';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Collections', to: '/shop?view=collections' },
  { label: 'New Arrivals', to: '/shop?newArrival=true' },
  { label: 'Best Sellers', to: '/shop?bestSeller=true' },
  { label: 'Sale', to: '/shop?onSale=true' },
  { label: 'About', to: '/about' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const cart = useCart();
  const wishlist = useWishlist();
  const { isAuthenticated } = useAuth();
  const { settings, categories } = useStorefront();
  const menuButtonRef = useRef(null);

  // The bar gains a solid background and a hairline once the page scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the drawer on navigation.
  useEffect(() => { setMenuOpen(false); }, [location.pathname, location.search]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Escape closes the drawer and returns focus to the trigger.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { setMenuOpen(false); menuButtonRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const brand = settings?.brand?.logoText || 'AARAVA';
  const isHome = location.pathname === '/';
  // On the homepage the navbar floats over the hero until scrolled.
  const transparent = isHome && !scrolled && !menuOpen;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-[90] transition-[background-color,border-color,box-shadow] duration-500 ${
          transparent
            ? 'border-b border-transparent bg-transparent'
            : 'border-b border-[var(--border)] bg-[rgba(250,246,240,0.92)] backdrop-blur-md'
        }`}
      >
        <nav className="shell flex items-center justify-between" style={{ height: 'var(--header-height)' }} aria-label="Main">
          {/* left — mobile menu / desktop logo */}
          <div className="flex flex-1 items-center gap-1 lg:flex-none">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className={`-ml-2 grid h-11 w-11 place-items-center lg:hidden ${transparent ? 'text-white' : 'text-[var(--text)]'}`}
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>

            <Link
              to="/"
              className={`hidden lg:block ${transparent ? 'text-white' : 'text-[var(--text)]'}`}
              aria-label={`${brand} home`}
            >
              <span className="font-[var(--font-display)] text-2xl font-light tracking-[0.3em]">{brand}</span>
            </Link>
          </div>

          {/* centre — logo on mobile, links on desktop */}
          <Link
            to="/"
            className={`lg:hidden ${transparent ? 'text-white' : 'text-[var(--text)]'}`}
            aria-label={`${brand} home`}
          >
            <span className="font-[var(--font-display)] text-xl font-light tracking-[0.28em]">{brand}</span>
          </Link>

          <ul className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => {
              const active = link.to === '/'
                ? location.pathname === '/'
                : location.pathname + location.search === link.to;
              return (
                <li key={link.label}>
                  <NavLink
                    to={link.to}
                    data-active={active}
                    className={`link-underline eyebrow transition-colors ${transparent ? 'text-white/90 hover:text-white' : 'text-[var(--text)] hover:text-[var(--primary)]'}`}
                  >
                    {link.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>

          {/* right — actions */}
          <div className={`flex flex-1 items-center justify-end gap-0.5 lg:flex-none ${transparent ? 'text-white' : 'text-[var(--text)]'}`}>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="hidden h-11 w-11 place-items-center transition hover:opacity-70 sm:grid"
            >
              <Search size={18} strokeWidth={1.5} />
            </button>

            <Link
              to={isAuthenticated ? '/account' : '/login'}
              aria-label={isAuthenticated ? 'Your account' : 'Sign in'}
              className="hidden h-11 w-11 place-items-center transition hover:opacity-70 lg:grid"
            >
              <User size={18} strokeWidth={1.5} />
            </Link>

            <Link
              to="/account/wishlist"
              aria-label={`Wishlist${wishlist.count ? `, ${wishlist.count} items` : ''}`}
              className="relative grid h-11 w-11 place-items-center transition hover:opacity-70"
            >
              <Heart size={18} strokeWidth={1.5} />
              {wishlist.count > 0 && <CountDot value={wishlist.count} />}
            </Link>

            <button
              type="button"
              onClick={() => cart.openDrawer()}
              aria-label={`Shopping bag${cart.count ? `, ${cart.count} items` : ', empty'}`}
              className="relative -mr-2 grid h-11 w-11 place-items-center transition hover:opacity-70"
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
              {cart.count > 0 && <CountDot value={cart.count} />}
            </button>
          </div>
        </nav>
      </header>

      {/* ---------------------------------------------------- mobile drawer -- */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-[95] bg-[rgba(28,33,29,0.45)] lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-[96] flex w-[87%] max-w-sm flex-col bg-[var(--background)] lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5" style={{ height: 'var(--header-height)' }}>
                <span className="font-[var(--font-display)] text-xl font-light tracking-[0.28em]">{brand}</span>
                <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="-mr-2 grid h-11 w-11 place-items-center">
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="px-5 py-5">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); setSearchOpen(true); }}
                    className="flex w-full items-center gap-3 border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-sm text-[var(--text-muted)]"
                  >
                    <Search size={16} strokeWidth={1.5} />
                    Search for pieces
                  </button>
                </div>

                <ul className="px-5">
                  {NAV_LINKS.map((link, i) => (
                    <motion.li
                      key={link.label}
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.06 + i * 0.045, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <Link to={link.to} className="flex items-center justify-between py-4">
                        <span className="font-[var(--font-display)] text-2xl font-light">{link.label}</span>
                        <ChevronRight size={16} className="text-[var(--text-muted)]" />
                      </Link>
                    </motion.li>
                  ))}
                </ul>

                {categories?.length > 0 && (
                  <div className="mt-6 px-5">
                    <p className="eyebrow mb-3 text-[var(--text-muted)]">Collections</p>
                    <ul className="grid grid-cols-2 gap-2">
                      {categories.map((c) => (
                        <li key={c.slug}>
                          <Link
                            to={`/category/${c.slug}`}
                            className="block border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                          >
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--border)] p-5">
                <Link to={isAuthenticated ? '/account' : '/login'} className="btn btn-primary btn-block">
                  {isAuthenticated ? 'My account' : 'Sign in'}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={navigate} />
    </>
  );
}

function CountDot({ value }) {
  return (
    <motion.span
      key={value}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute right-1 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--accent)] px-1 text-[0.5625rem] font-semibold text-white"
      aria-hidden="true"
    >
      {value > 99 ? '99+' : value}
    </motion.span>
  );
}
