import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, BadgeCheck } from 'lucide-react';
import {
  AdminPageHeader, AdminTable, ConfirmDelete,
} from '../../components/admin/AdminUI.jsx';
import { SmartImage, Badge, Rating } from '../../components/ui/Primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api, qs } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';

const FILTERS = [
  { value: 'pending', label: 'Awaiting moderation' },
  { value: 'approved', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
];

const TONES = { approved: 'success', rejected: 'error', pending: 'muted' };

export default function AdminReviews() {
  const [status, setStatus] = useState('pending');
  const toast = useToast();

  useSeo({ title: 'Reviews', noIndex: true });

  const { data: reviews, loading, error, refetch } = useFetch(
    `/admin/reviews${qs({ status })}`,
    { deps: [status] },
  );

  const moderate = async (review, nextStatus) => {
    try {
      await api.patch(`/admin/reviews/${review._id}`, { status: nextStatus });
      toast.success(nextStatus === 'approved' ? 'Review published.' : 'Review rejected.');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not moderate that review.');
    }
  };

  const remove = async (review) => {
    try {
      await api.delete(`/admin/reviews/${review._id}`);
      toast.success('Review deleted.');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Could not delete that review.');
    }
  };

  const columns = [
    {
      key: 'product',
      header: 'Product',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-10 shrink-0">
            <SmartImage src={r.product?.images?.[0]?.url} alt="" ratio="3/4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {r.product?.slug ? (
                <Link to={`/product/${r.product.slug}`} target="_blank" className="link-underline">
                  {r.product.name}
                </Link>
              ) : (r.product?.name || 'Deleted product')}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{formatDate(r.createdAt)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'review',
      header: 'Review',
      render: (r) => (
        <div className="min-w-0 max-w-md">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Rating value={r.rating} size={12} />
            {r.isVerifiedPurchase && (
              <span className="inline-flex items-center gap-1 text-[0.6875rem] text-[var(--success)]">
                <BadgeCheck size={12} aria-hidden="true" /> Verified
              </span>
            )}
          </div>
          {r.title && <p className="text-sm font-medium">{r.title}</p>}
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">{r.comment}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">— {r.name}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={TONES[r.status] || 'muted'}>{r.status}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2.5">
          {r.status !== 'approved' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); moderate(r, 'approved'); }}
              className="inline-flex items-center gap-1 text-xs text-[var(--success)] hover:underline"
            >
              <Check size={13} aria-hidden="true" /> Publish
            </button>
          )}
          {r.status !== 'rejected' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); moderate(r, 'rejected'); }}
              className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--error)]"
            >
              <X size={13} aria-hidden="true" /> Reject
            </button>
          )}
          <span onClick={(e) => e.stopPropagation()}>
            <ConfirmDelete onConfirm={() => remove(r)} />
          </span>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Reviews"
        description="Moderate customer reviews before they appear on product pages."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = status === f.value;
          return (
            <button
              key={f.label}
              type="button"
              aria-pressed={active}
              onClick={() => setStatus(f.value)}
              className={`border px-3.5 py-2 text-xs transition-colors ${
                active
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--text-inverse)]'
                  : 'border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--text)]'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <AdminTable
        columns={columns}
        rows={reviews}
        loading={loading}
        error={error}
        emptyTitle={status === 'pending' ? 'Nothing awaiting moderation' : 'No reviews here'}
        emptyDescription={
          status === 'pending'
            ? 'New customer reviews will queue here for approval.'
            : 'Try a different filter.'
        }
      />
    </>
  );
}
