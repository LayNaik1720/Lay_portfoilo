import { useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, Star } from 'lucide-react';
import { AccountSection } from './AccountLayout.jsx';
import {
  EmptyState, ErrorState, LoadingSkeleton, Modal, Badge,
} from '../../components/ui/Primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';

const EMPTY = {
  label: 'Home', fullName: '', mobile: '', house: '', street: '', area: '',
  city: '', state: '', pincode: '', country: 'India', isDefault: false,
};

const INDIAN_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

function AddressForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({
    ...form,
    [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  });

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.fullName.trim().length < 2) next.fullName = 'Name is required.';
    if (form.mobile.replace(/\D/g, '').length < 10) next.mobile = 'Enter a valid number.';
    if (!form.house.trim()) next.house = 'House / flat is required.';
    if (!form.city.trim()) next.city = 'City is required.';
    if (!form.state) next.state = 'State is required.';
    if (!/^\d{4,10}$/.test(form.pincode)) next.pincode = 'Enter a valid pincode.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      await onSave(form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="p-6">
      <h2 className="display-sm mb-5">{initial?._id ? 'Edit address' : 'Add an address'}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="a-label">Label</label>
          <input id="a-label" className="field" value={form.label} onChange={set('label')} placeholder="Home, Office…" />
        </div>
        <div>
          <label className="field-label" htmlFor="a-name">Full name</label>
          <input
            id="a-name" className="field" value={form.fullName} onChange={set('fullName')} required
            aria-invalid={errors.fullName ? 'true' : undefined}
          />
          {errors.fullName && <span className="field-error">{errors.fullName}</span>}
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="a-mobile">Mobile</label>
          <input
            id="a-mobile" type="tel" className="field" value={form.mobile} onChange={set('mobile')} required
            aria-invalid={errors.mobile ? 'true' : undefined}
          />
          {errors.mobile && <span className="field-error">{errors.mobile}</span>}
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="a-house">House / flat / building</label>
          <input
            id="a-house" className="field" value={form.house} onChange={set('house')} required
            aria-invalid={errors.house ? 'true' : undefined}
          />
          {errors.house && <span className="field-error">{errors.house}</span>}
        </div>
        <div>
          <label className="field-label" htmlFor="a-street">Street</label>
          <input id="a-street" className="field" value={form.street} onChange={set('street')} />
        </div>
        <div>
          <label className="field-label" htmlFor="a-area">Area / landmark</label>
          <input id="a-area" className="field" value={form.area} onChange={set('area')} />
        </div>
        <div>
          <label className="field-label" htmlFor="a-city">City</label>
          <input
            id="a-city" className="field" value={form.city} onChange={set('city')} required
            aria-invalid={errors.city ? 'true' : undefined}
          />
          {errors.city && <span className="field-error">{errors.city}</span>}
        </div>
        <div>
          <label className="field-label" htmlFor="a-state">State</label>
          <select
            id="a-state" className="field" value={form.state} onChange={set('state')} required
            aria-invalid={errors.state ? 'true' : undefined}
          >
            <option value="">Select a state</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.state && <span className="field-error">{errors.state}</span>}
        </div>
        <div>
          <label className="field-label" htmlFor="a-pincode">Pincode</label>
          <input
            id="a-pincode" inputMode="numeric" className="field" value={form.pincode} required
            onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })}
            aria-invalid={errors.pincode ? 'true' : undefined}
          />
          {errors.pincode && <span className="field-error">{errors.pincode}</span>}
        </div>
        <div>
          <label className="field-label" htmlFor="a-country">Country</label>
          <input id="a-country" className="field" value={form.country} readOnly />
        </div>
      </div>

      <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-sm">
        <input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} className="h-4 w-4" />
        Make this my default address
      </label>

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onCancel} className="btn btn-outline flex-1" disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn-primary flex-1" disabled={busy}>
          {busy ? 'Saving…' : 'Save address'}
        </button>
      </div>
    </form>
  );
}

export default function AccountAddresses() {
  const { data: addresses, loading, error, refetch } = useFetch('/auth/addresses');
  const toast = useToast();
  const [editing, setEditing] = useState(null);

  useSeo({ title: 'Addresses', noIndex: true });

  const save = async (form) => {
    try {
      if (form._id) await api.put(`/auth/addresses/${form._id}`, form);
      else await api.post('/auth/addresses', form);
      toast.success('Address saved.');
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not save that address.');
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/auth/addresses/${id}`);
      toast.success('Address removed.');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not remove that address.');
    }
  };

  const makeDefault = async (address) => {
    try {
      await api.put(`/auth/addresses/${address._id}`, { ...address, isDefault: true });
      toast.success('Default address updated.');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not update that address.');
    }
  };

  return (
    <AccountSection
      title="Addresses"
      description="Saved addresses make checkout a two-tap affair."
      action={(
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing({})}>
          <Plus size={14} /> Add address
        </button>
      )}
    >
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => <LoadingSkeleton key={i} className="h-44 w-full" />)}
        </div>
      ) : addresses?.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address._id} className="flex flex-col border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MapPin size={15} strokeWidth={1.5} className="text-[var(--text-muted)]" aria-hidden="true" />
                  <span className="text-sm font-medium">{address.label || 'Address'}</span>
                </div>
                {address.isDefault && <Badge tone="success">Default</Badge>}
              </div>

              <address className="flex-1 text-sm not-italic leading-relaxed text-[var(--text-muted)]">
                <span className="block font-medium text-[var(--text)]">{address.fullName}</span>
                {[address.house, address.street, address.area].filter(Boolean).join(', ')}<br />
                {address.city}, {address.state} {address.pincode}<br />
                {address.mobile}
              </address>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                <button
                  type="button" onClick={() => setEditing(address)}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
                >
                  <Pencil size={12} aria-hidden="true" /> Edit
                </button>
                {!address.isDefault && (
                  <>
                    <button
                      type="button" onClick={() => makeDefault(address)}
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
                    >
                      <Star size={12} aria-hidden="true" /> Make default
                    </button>
                    <button
                      type="button" onClick={() => remove(address._id)}
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--error)]"
                    >
                      <Trash2 size={12} aria-hidden="true" /> Remove
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={MapPin}
          title="No addresses saved"
          description="Add one now and checkout gets a lot quicker next time."
          action={(
            <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
              <Plus size={14} /> Add an address
            </button>
          )}
        />
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} label="Address" maxWidth="max-w-2xl">
        {editing && (
          <AddressForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />
        )}
      </Modal>
    </AccountSection>
  );
}
