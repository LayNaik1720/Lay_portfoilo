import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Heart, MapPin, ArrowRight, Check } from 'lucide-react';
import { AccountSection } from './AccountLayout.jsx';
import { LoadingSkeleton, Badge } from '../../components/ui/Primitives.jsx';
import { PasswordField } from '../LoginPage.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatPrice, formatDate, ORDER_STATUS_LABELS, statusTone } from '../../lib/format.js';

function ProfileForm() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user?.name || '', mobile: user?.mobile || '' });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch('/auth/profile', { name: form.name.trim(), mobile: form.mobile.trim() });
      await refresh();
      setSaved(true);
      toast.success('Profile updated.');
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      toast.error(err.message || 'Could not save your details.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
      <h3 className="display-sm mb-5">Your details</h3>
      <div className="space-y-4">
        <div>
          <label className="field-label" htmlFor="p-name">Full name</label>
          <input
            id="p-name" className="field" value={form.name} required
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="p-mobile">Mobile</label>
          <input
            id="p-mobile" type="tel" className="field" value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="p-email">Email</label>
          <input id="p-email" className="field" value={user?.email || ''} readOnly disabled />
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            Email is tied to your order history and cannot be changed here.
          </p>
        </div>
      </div>
      <button type="submit" className="btn btn-primary mt-5" disabled={busy}>
        {saved ? <><Check size={14} /> Saved</> : busy ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post('/auth/change-password', form);
      setForm({ currentPassword: '', newPassword: '' });
      toast.success('Password changed.');
    } catch (err) {
      setError(err.message || 'Could not change your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
      <h3 className="display-sm mb-5">Password</h3>
      <div className="space-y-4">
        <PasswordField
          id="current" label="Current password" autoComplete="current-password" required
          value={form.currentPassword}
          onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
        />
        <PasswordField
          id="new" label="New password" autoComplete="new-password" required minLength={8}
          value={form.newPassword}
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          error={error}
        />
      </div>
      <button type="submit" className="btn btn-outline mt-5" disabled={busy}>
        {busy ? 'Updating…' : 'Change password'}
      </button>
    </form>
  );
}

export default function AccountOverview() {
  const { data: orders, loading } = useFetch('/orders/mine?limit=3');
  const { data: addresses } = useFetch('/auth/addresses');
  const wishlist = useWishlist();

  useSeo({ title: 'Account overview', noIndex: true });

  const stats = [
    { label: 'Orders', value: orders?.length ?? 0, to: '/account/orders', Icon: Package },
    { label: 'Wishlist', value: wishlist.count, to: '/account/wishlist', Icon: Heart },
    { label: 'Addresses', value: addresses?.length ?? 0, to: '/account/addresses', Icon: MapPin },
  ];

  return (
    <AccountSection title="Overview" description="Your orders, saved pieces and details at a glance.">
      {/* ---- stat tiles */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {stats.map(({ label, value, to, Icon }) => (
          <Link
            key={label}
            to={to}
            className="group border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--primary)] md:p-5"
          >
            <Icon size={17} strokeWidth={1.4} className="mb-3 text-[var(--text-muted)]" aria-hidden="true" />
            <p className="font-[var(--font-display)] text-3xl font-light leading-none">{value}</p>
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">{label}</p>
          </Link>
        ))}
      </div>

      {/* ---- recent orders */}
      <section className="mt-10" aria-labelledby="recent-heading">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 id="recent-heading" className="display-sm">Recent orders</h3>
          <Link to="/account/orders" className="inline-flex items-center gap-1.5 text-sm link-underline">
            All orders <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => <LoadingSkeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : orders?.length ? (
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {orders.map((order) => (
              <li key={order._id}>
                <Link
                  to={`/account/orders/${order._id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{order.orderNumber}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {formatDate(order.createdAt)} · {order.items.length} item{order.items.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge tone={statusTone(order.status)}>
                      {ORDER_STATUS_LABELS[order.status] || order.status}
                    </Badge>
                    <span className="text-sm tabular-nums">{formatPrice(order.total)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border border-dashed border-[var(--border-strong)] px-5 py-10 text-center">
            <p className="text-sm text-[var(--text-muted)]">You haven’t placed an order yet.</p>
            <Link to="/shop" className="btn btn-primary mt-5">Shop the collection</Link>
          </div>
        )}
      </section>

      {/* ---- settings */}
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <ProfileForm />
        <PasswordForm />
      </div>
    </AccountSection>
  );
}
