import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Heart, MapPin, Star, LogOut, User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const LINKS = [
  { to: '/account', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/account/orders', label: 'Orders', Icon: Package },
  { to: '/account/wishlist', label: 'Wishlist', Icon: Heart },
  { to: '/account/addresses', label: 'Addresses', Icon: MapPin },
  { to: '/account/reviews', label: 'Reviews', Icon: Star },
];

export default function AccountLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    toast.success('Signed out.');
    navigate('/');
  };

  return (
    <div className="shell section">
      <header className="mb-8 md:mb-12">
        <p className="eyebrow mb-3 text-[var(--accent)]">Your account</p>
        <h1 className="display-xl">Hello, {user?.name?.split(' ')[0] || 'there'}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{user?.email}</p>
      </header>

      <div className="lg:grid lg:grid-cols-[14rem_1fr] lg:gap-14">
        {/* Horizontal scroll rail on mobile, vertical sidebar on desktop. */}
        <nav aria-label="Account sections" className="mb-8 lg:mb-0">
          <ul className="scroll-x gap-1 border-b border-[var(--border)] pb-0 lg:block lg:space-y-0.5 lg:overflow-visible lg:border-b-0">
            {LINKS.map(({ to, label, Icon, end }) => (
              <li key={to} className="shrink-0">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) => `flex items-center gap-3 whitespace-nowrap px-3 py-3 text-sm transition-colors lg:px-3.5 ${
                    isActive
                      ? 'border-b-2 border-[var(--primary)] font-medium text-[var(--text)] lg:border-b-0 lg:border-l-2 lg:bg-[var(--surface-muted)]'
                      : 'border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text)] lg:border-b-0 lg:border-l-2'
                  }`}
                >
                  <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
            <li className="shrink-0 lg:mt-4 lg:border-t lg:border-[var(--border)] lg:pt-4">
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-3 whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--error)] lg:border-b-0 lg:border-l-2 lg:px-3.5"
              >
                <LogOut size={16} strokeWidth={1.5} aria-hidden="true" />
                Sign out
              </button>
            </li>
          </ul>
        </nav>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Shared page heading inside the account area. */
export function AccountSection({ title, description, action, children }) {
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="display-lg">{title}</h2>
          {description && <p className="mt-1.5 text-sm text-[var(--text-muted)]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export { User };
