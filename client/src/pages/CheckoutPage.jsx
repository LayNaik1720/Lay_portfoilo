import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Truck, Banknote, CreditCard, ChevronLeft, ShieldCheck } from 'lucide-react';
import { OrderSummary } from '../components/OrderSummary.jsx';
import { SmartImage, LoadingSkeleton, EmptyState } from '../components/ui/Primitives.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useStorefront } from '../context/StorefrontContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useSeo } from '../hooks/useSeo.js';
import { api } from '../lib/api.js';
import { formatPrice } from '../lib/format.js';

const EMPTY_ADDRESS = {
  fullName: '', mobile: '', house: '', street: '', area: '',
  city: '', state: '', pincode: '', country: 'India',
};

const INDIAN_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

/** Small labelled input that surfaces server-side field errors. */
function Field({ id, label, error, className = '', children, ...props }) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={id}>{label}</label>
      {children || (
        <input id={id} className="field" aria-invalid={error ? 'true' : undefined} {...props} />
      )}
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
}

export default function CheckoutPage() {
  const { items, totals, loading: cartLoading, refresh } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { settings } = useStorefront();
  const toast = useToast();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState({ name: '', email: '', mobile: '' });
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [selectedAddressId, setSelectedAddressId] = useState('new');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const { data: savedAddresses } = useFetch('/auth/addresses', { skip: !isAuthenticated });

  useSeo({ title: 'Checkout', noIndex: true });

  const codEnabled = settings?.shipping?.codEnabled !== false;
  const codCharge = settings?.shipping?.codExtraCharge || 0;

  // Prefill from the signed-in profile.
  useEffect(() => {
    if (!user) return;
    setCustomer((c) => ({
      name: c.name || user.name || '',
      email: c.email || user.email || '',
      mobile: c.mobile || user.mobile || '',
    }));
  }, [user]);

  // Preselect the default saved address.
  useEffect(() => {
    if (!savedAddresses?.length) return;
    const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
    setSelectedAddressId(def._id);
    setAddress({ ...EMPTY_ADDRESS, ...def });
  }, [savedAddresses]);

  const chooseAddress = (id) => {
    setSelectedAddressId(id);
    if (id === 'new') { setAddress(EMPTY_ADDRESS); return; }
    const found = savedAddresses?.find((a) => a._id === id);
    if (found) setAddress({ ...EMPTY_ADDRESS, ...found });
  };

  const displayTotals = useMemo(() => {
    if (!totals) return totals;
    const extra = paymentMethod === 'cod' ? codCharge : 0;
    return { ...totals, codCharge: extra, total: (totals.total || 0) + extra };
  }, [totals, paymentMethod, codCharge]);

  /* --------------------------------------------------------- validation -- */

  const validate = () => {
    const e = {};
    if (!customer.name.trim() || customer.name.trim().length < 2) e.name = 'Please enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(customer.email)) e.email = 'Enter a valid email address.';
    if (customer.mobile.replace(/\D/g, '').length < 10) e.mobile = 'Enter a valid mobile number.';
    if (!address.fullName.trim()) e.fullName = 'Recipient name is required.';
    if (address.mobile.replace(/\D/g, '').length < 10) e.addrMobile = 'Enter a valid contact number.';
    if (!address.house.trim()) e.house = 'House / flat is required.';
    if (!address.city.trim()) e.city = 'City is required.';
    if (!address.state.trim()) e.state = 'State is required.';
    if (!/^\d{4,10}$/.test(address.pincode)) e.pincode = 'Enter a valid pincode.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ------------------------------------------------------------- submit -- */

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      toast.error('Please correct the highlighted fields.');
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer: {
          name: customer.name.trim(),
          email: customer.email.trim().toLowerCase(),
          mobile: customer.mobile.trim(),
        },
        items: items.map((i) => ({
          productId: i.product.id,
          variantId: i.variantId || null,
          quantity: i.quantity,
        })),
        shippingAddress: {
          fullName: address.fullName.trim(),
          mobile: address.mobile.trim(),
          house: address.house.trim(),
          street: address.street || '',
          area: address.area || '',
          city: address.city.trim(),
          state: address.state.trim(),
          pincode: address.pincode.trim(),
          country: address.country || 'India',
        },
        paymentMethod,
        couponCode: totals?.couponCode || '',
        customerNote: note,
      };

      const { data } = await api.post('/orders', payload);
      const order = data.order;

      if (paymentMethod !== 'cod') {
        // Online payment: the server issues a payment intent and verifies the
        // signature itself. No key or secret is ever handled in the browser.
        const sim = await api.post(`/orders/${order._id}/simulate-payment`, {});
        await api.post('/orders/verify-payment', {
          orderId: sim.data.orderId,
          paymentId: sim.data.paymentId,
          signature: sim.data.signature,
        });
      }

      await refresh();
      navigate(`/order-success/${order._id}`, { replace: true, state: { orderNumber: order.orderNumber } });
    } catch (err) {
      const message = err.message || 'We could not place your order. Please try again.';
      toast.error(message);
      if (err.status === 409) await refresh(); // stock changed under us
      setErrors((prev) => ({ ...prev, form: message }));
    } finally {
      setSubmitting(false);
    }
  };

  /* --------------------------------------------------------------- views -- */

  if (cartLoading) {
    return (
      <div className="shell section">
        <LoadingSkeleton className="mb-8 h-10 w-48" />
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
          <LoadingSkeleton className="h-[30rem] w-full" />
          <LoadingSkeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="shell section">
        <EmptyState
          title="Your bag is empty"
          description="Add a piece to your bag before heading to checkout."
          action={<Link to="/shop" className="btn btn-primary">Shop the collection</Link>}
        />
      </div>
    );
  }

  const paymentOptions = [
    ...(codEnabled ? [{
      value: 'cod', label: 'Cash on delivery', Icon: Banknote,
      hint: codCharge > 0 ? `${formatPrice(codCharge)} handling fee` : 'Pay when it arrives',
    }] : []),
    { value: 'upi', label: 'UPI', Icon: CreditCard, hint: 'GPay, PhonePe, Paytm' },
    { value: 'card', label: 'Card', Icon: CreditCard, hint: 'Credit or debit' },
    { value: 'netbanking', label: 'Net banking', Icon: CreditCard, hint: 'All major banks' },
  ];

  return (
    <div className="shell section">
      <Link to="/cart" className="mb-6 inline-flex items-center gap-2 text-sm link-underline">
        <ChevronLeft size={14} /> Back to bag
      </Link>

      <h1 className="display-xl mb-8 md:mb-12">Checkout</h1>

      <form onSubmit={submit} noValidate>
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
          <div className="min-w-0 space-y-10">
            {/* ------------------------------------------------- contact -- */}
            <section aria-labelledby="contact-heading">
              <div className="mb-5 flex items-baseline gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-[0.625rem] text-[var(--text-inverse)]">1</span>
                <h2 id="contact-heading" className="display-sm">Contact details</h2>
              </div>

              {!isAuthenticated && (
                <p className="mb-5 border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs text-[var(--text-muted)]">
                  Checking out as a guest.{' '}
                  <Link to="/login" className="link-underline text-[var(--text)]">Sign in</Link>{' '}
                  to use saved addresses and track your order.
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="name" label="Full name" autoComplete="name" required
                  value={customer.name} error={errors.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                />
                <Field
                  id="mobile" label="Mobile number" type="tel" inputMode="tel" autoComplete="tel" required
                  value={customer.mobile} error={errors.mobile}
                  onChange={(e) => setCustomer({ ...customer, mobile: e.target.value })}
                />
                <Field
                  id="email" label="Email" type="email" autoComplete="email" required
                  className="sm:col-span-2"
                  value={customer.email} error={errors.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                />
              </div>
            </section>

            {/* ------------------------------------------------- shipping -- */}
            <section aria-labelledby="shipping-heading">
              <div className="mb-5 flex items-baseline gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-[0.625rem] text-[var(--text-inverse)]">2</span>
                <h2 id="shipping-heading" className="display-sm">Shipping address</h2>
              </div>

              {savedAddresses?.length > 0 && (
                <div className="mb-6 space-y-2.5">
                  {savedAddresses.map((a) => (
                    <label
                      key={a._id}
                      className={`flex cursor-pointer gap-3 border p-4 transition-colors ${
                        selectedAddressId === a._id ? 'border-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <input
                        type="radio" name="savedAddress" value={a._id}
                        checked={selectedAddressId === a._id}
                        onChange={() => chooseAddress(a._id)}
                        className="sr-only"
                      />
                      <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                        selectedAddressId === a._id ? 'border-[var(--primary)]' : 'border-[var(--border-strong)]'
                      }`}>
                        {selectedAddressId === a._id && <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />}
                      </span>
                      <span className="text-sm leading-relaxed">
                        <span className="font-medium">{a.fullName}</span>
                        {a.label && <span className="ml-2 badge bg-[var(--surface-muted)] text-[var(--text-muted)]">{a.label}</span>}
                        <br />
                        <span className="text-[var(--text-muted)]">
                          {[a.house, a.street, a.area, a.city, a.state, a.pincode].filter(Boolean).join(', ')}
                        </span>
                      </span>
                    </label>
                  ))}

                  <label className={`flex cursor-pointer items-center gap-3 border p-4 transition-colors ${
                    selectedAddressId === 'new' ? 'border-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                  }`}>
                    <input
                      type="radio" name="savedAddress" value="new"
                      checked={selectedAddressId === 'new'}
                      onChange={() => chooseAddress('new')}
                      className="sr-only"
                    />
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                      selectedAddressId === 'new' ? 'border-[var(--primary)]' : 'border-[var(--border-strong)]'
                    }`}>
                      {selectedAddressId === 'new' && <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />}
                    </span>
                    <span className="text-sm">Use a different address</span>
                  </label>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="fullName" label="Recipient name" autoComplete="name" required
                  value={address.fullName} error={errors.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                />
                <Field
                  id="addrMobile" label="Contact number" type="tel" inputMode="tel" required
                  value={address.mobile} error={errors.addrMobile}
                  onChange={(e) => setAddress({ ...address, mobile: e.target.value })}
                />
                <Field
                  id="house" label="House / flat / building" autoComplete="address-line1" required
                  className="sm:col-span-2"
                  value={address.house} error={errors.house}
                  onChange={(e) => setAddress({ ...address, house: e.target.value })}
                />
                <Field
                  id="street" label="Street (optional)" autoComplete="address-line2"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                />
                <Field
                  id="area" label="Area / landmark (optional)"
                  value={address.area}
                  onChange={(e) => setAddress({ ...address, area: e.target.value })}
                />
                <Field
                  id="city" label="City" autoComplete="address-level2" required
                  value={address.city} error={errors.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                />
                <Field id="state" label="State" error={errors.state}>
                  <select
                    id="state" className="field" required
                    value={address.state}
                    aria-invalid={errors.state ? 'true' : undefined}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  >
                    <option value="">Select a state</option>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field
                  id="pincode" label="Pincode" inputMode="numeric" autoComplete="postal-code" required
                  value={address.pincode} error={errors.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '') })}
                />
                <Field id="country" label="Country" value={address.country} readOnly />
              </div>
            </section>

            {/* -------------------------------------------------- payment -- */}
            <section aria-labelledby="payment-heading">
              <div className="mb-5 flex items-baseline gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-[0.625rem] text-[var(--text-inverse)]">3</span>
                <h2 id="payment-heading" className="display-sm">Payment</h2>
              </div>

              <fieldset className="grid gap-2.5 sm:grid-cols-2">
                <legend className="sr-only">Payment method</legend>
                {paymentOptions.map(({ value, label, Icon, hint }) => {
                  const active = paymentMethod === value;
                  return (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-center gap-3 border p-4 transition-colors ${
                        active ? 'border-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <input
                        type="radio" name="paymentMethod" value={value}
                        checked={active} onChange={() => setPaymentMethod(value)}
                        className="sr-only"
                      />
                      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                        active ? 'border-[var(--primary)]' : 'border-[var(--border-strong)]'
                      }`}>
                        {active && <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />}
                      </span>
                      <Icon size={16} strokeWidth={1.4} className="shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm">{label}</span>
                        <span className="block text-xs text-[var(--text-muted)]">{hint}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>

              {paymentMethod !== 'cod' && (
                <p className="mt-4 flex items-start gap-2 border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-xs text-[var(--text-muted)]">
                  <ShieldCheck size={15} className="mt-px shrink-0 text-[var(--success)]" aria-hidden="true" />
                  <span>
                    This demo uses a sandbox gateway. The payment signature is generated and
                    verified entirely on the server — no keys are exposed to the browser.
                    Plug in live Razorpay credentials via environment variables to go live.
                  </span>
                </p>
              )}

              <div className="mt-6">
                <label className="field-label" htmlFor="note">Order note (optional)</label>
                <textarea
                  id="note" className="field" maxLength={500} rows={3}
                  value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Delivery instructions, gift message…"
                />
              </div>
            </section>
          </div>

          {/* ------------------------------------------------------ summary */}
          <div className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
            <div className="mb-5 border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="display-sm mb-4">{items.length} item{items.length === 1 ? '' : 's'}</h2>
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={`${item.product.id}-${item.variantId || 'base'}`} className="flex gap-3">
                    <div className="w-14 shrink-0">
                      <SmartImage src={item.product.image} alt={item.product.name} ratio="3/4" />
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-medium leading-snug">{item.product.name}</p>
                      <p className="mt-0.5 text-[var(--text-muted)]">
                        {[item.size, item.color].filter(Boolean).join(' · ')}
                        {(item.size || item.color) ? ' · ' : ''}Qty {item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs tabular-nums">{formatPrice(item.lineTotal)}</p>
                  </li>
                ))}
              </ul>
            </div>

            <OrderSummary
              totals={displayTotals}
              action={(
                <>
                  <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                    {submitting ? 'Placing order…' : (
                      <>
                        <Lock size={13} />
                        {paymentMethod === 'cod' ? 'Place order' : `Pay ${formatPrice(displayTotals.total)}`}
                      </>
                    )}
                  </button>
                  {errors.form && <p className="field-error mt-2 text-center" role="alert">{errors.form}</p>}
                </>
              )}
            />

            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
              <Truck size={13} aria-hidden="true" />
              Delivered in {settings?.shipping?.estimatedDeliveryDays || '4–7 business days'}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
