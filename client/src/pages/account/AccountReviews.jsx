import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, PenLine } from 'lucide-react';
import { AccountSection } from './AccountLayout.jsx';
import {
  SmartImage, Rating, Badge, EmptyState, LoadingSkeleton, Modal,
} from '../../components/ui/Primitives.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useSeo } from '../../hooks/useSeo.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= (hover || value);
        return (
          <button
            key={n} type="button" role="radio" aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)} className="p-1"
          >
            <Star
              size={22}
              className={filled ? 'text-[var(--gold)]' : 'text-[var(--border-strong)]'}
              fill={filled ? 'currentColor' : 'none'}
              strokeWidth={1.4}
            />
          </button>
        );
      })}
    </div>
  );
}

function WriteReviewDialog({ product, onClose, onDone }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post('/reviews', { product: product._id, rating, title, comment });
      toast.success('Thank you — your review is awaiting moderation.');
      onDone();
    } catch (err) {
      setError(err.message || 'Could not submit your review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} label={`Review ${product.name}`}>
      <form onSubmit={submit} className="p-6">
        <div className="mb-5 flex items-center gap-4">
          <div className="w-14 shrink-0">
            <SmartImage src={product.images?.[0]?.url} alt="" ratio="3/4" />
          </div>
          <div>
            <h2 className="display-sm">Review this piece</h2>
            <p className="text-sm text-[var(--text-muted)]">{product.name}</p>
          </div>
        </div>

        <div className="mb-4">
          <span className="field-label">Your rating</span>
          <StarInput value={rating} onChange={setRating} />
        </div>

        <div className="mb-4">
          <label className="field-label" htmlFor="r-title">Headline</label>
          <input id="r-title" className="field" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="field-label" htmlFor="r-comment">Your review</label>
          <textarea
            id="r-comment" className="field" rows={4} required minLength={10} maxLength={1500}
            value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="How does it fit? How is the fabric?"
          />
        </div>

        {error && <p className="field-error mb-3" role="alert">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn btn-outline flex-1" disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary flex-1" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit review'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AccountReviews() {
  const { data: mine, loading, refetch } = useFetch('/reviews/mine');
  const { data: pending, refetch: refetchPending } = useFetch('/reviews/reviewable');
  const [writing, setWriting] = useState(null);

  useSeo({ title: 'Your reviews', noIndex: true });

  const done = () => {
    setWriting(null);
    refetch();
    refetchPending();
  };

  return (
    <AccountSection title="Reviews" description="Your thoughts on the pieces you’ve received.">
      {/* ---- awaiting review */}
      {pending?.length > 0 && (
        <section className="mb-10" aria-labelledby="pending-heading">
          <h3 id="pending-heading" className="display-sm mb-4">Awaiting your review</h3>
          <ul className="space-y-3">
            {pending.map((product) => (
              <li
                key={product._id}
                className="flex items-center gap-4 border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <Link to={`/product/${product.slug}`} className="w-14 shrink-0">
                  <SmartImage src={product.images?.[0]?.url} alt="" ratio="3/4" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">
                    <Link to={`/product/${product.slug}`} className="link-underline">{product.name}</Link>
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">Delivered — tell us what you think</p>
                </div>
                <button
                  type="button" className="btn btn-outline btn-sm shrink-0"
                  onClick={() => setWriting(product)}
                >
                  <PenLine size={13} /> Review
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- submitted */}
      <section aria-labelledby="mine-heading">
        {pending?.length > 0 && <h3 id="mine-heading" className="display-sm mb-4">Your reviews</h3>}

        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => <LoadingSkeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : mine?.length ? (
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {mine.map((review) => (
              <li key={review._id} className="flex gap-4 py-5">
                <Link to={`/product/${review.product?.slug}`} className="w-14 shrink-0">
                  <SmartImage src={review.product?.images?.[0]?.url} alt="" ratio="3/4" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Rating value={review.rating} size={12} />
                    <Badge tone={review.status === 'approved' ? 'success' : review.status === 'rejected' ? 'error' : 'muted'}>
                      {review.status === 'approved' ? 'Published' : review.status === 'rejected' ? 'Not published' : 'Awaiting moderation'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">
                    <Link to={`/product/${review.product?.slug}`} className="link-underline">
                      {review.product?.name}
                    </Link>
                  </p>
                  {review.title && <p className="mt-1 text-sm">{review.title}</p>}
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">{review.comment}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">{formatDate(review.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : !pending?.length ? (
          <EmptyState
            icon={Star}
            title="No reviews yet"
            description="Once an order is delivered you’ll be able to review it here."
            action={<Link to="/shop" className="btn btn-primary">Shop the collection</Link>}
          />
        ) : null}
      </section>

      {writing && (
        <WriteReviewDialog product={writing} onClose={() => setWriting(null)} onDone={done} />
      )}
    </AccountSection>
  );
}
