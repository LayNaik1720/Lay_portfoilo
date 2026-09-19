/** Shared formatting helpers. */

export function formatPrice(value) {
  const n = Number(value) || 0;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function discountPercent(price, originalPrice) {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export function formatDate(value, opts = {}) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', ...opts,
  });
}

export function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** "2 days ago" style relative time for the purchase notice. */
export function timeAgo(value) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? 'a week ago' : `${weeks} weeks ago`;
}

export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  payment_processing: 'Payment processing',
  payment_confirmed: 'Payment confirmed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  return_requested: 'Return requested',
  returned: 'Returned',
  refund_initiated: 'Refund initiated',
  refunded: 'Refunded',
};

export function statusTone(status) {
  if (['delivered', 'refunded'].includes(status)) return 'success';
  if (['cancelled', 'returned'].includes(status)) return 'error';
  if (['shipped', 'packed', 'confirmed', 'payment_confirmed'].includes(status)) return 'info';
  return 'muted';
}

/** Build a WhatsApp deep link with a pre-filled message. */
export function whatsappLink(number, message) {
  const clean = String(number || '').replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message || '')}`;
}
