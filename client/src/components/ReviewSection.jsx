import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Star } from 'lucide-react';
import { Rating, EmptyState, LoadingSkeleton } from './ui/Primitives.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/format.js';

/** Star picker used in the write-a-review form. */
function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= (hover || value);
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            className="p-1"
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

function ReviewForm({ productId, onDone }) {
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
      await api.post('/reviews', { product: productId, rating, title, comment });
      toast.success('Thank you — your review is awaiting moderation.');
      setTitle(''); setComment(''); setRating(5);
      onDone?.();
    } catch (err) {
      setError(err.message || 'Could not submit your review.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
      <h3 className="display-sm mb-4">Write a review</h3>

      <div className="mb-4">
        <span className="field-label">Your rating</span>
        <StarInput value={rating} onChange={setRating} />
      </div>

      <div className="mb-4">
        <label className="field-label" htmlFor="review-title">Headline</label>
        <input
          id="review-title" className="field" value={title} maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum it up in a few words"
        />
      </div>

      <div className="mb-4">
        <label className="field-label" htmlFor="review-comment">Your review</label>
        <textarea
          id="review-comment" className="field" required minLength={10} maxLength={1500}
          value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder="How does it fit? How is the fabric?"
        />
      </div>

      {error && <p className="field-error mb-3" role="alert">{error}</p>}

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Submitting…' : 'Submit review'}
      </button>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Reviews are published after moderation. Only customers who bought this piece
        are marked as a verified purchase.
      </p>
    </form>
  );
}

export function ReviewSection({ product, initialReviews = [] }) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const { data, loading, refetch } = useFetch(`/products/${product.slug}/reviews`, {
    initialData: initialReviews,
  });

  const reviews = data || [];
  const average = product.ratingAverage || 0;
  const count = product.ratingCount || reviews.length;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <section id="reviews" className="section border-t border-[var(--border)]" aria-labelledby="reviews-heading">
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-[20rem_1fr] lg:gap-16">
          {/* ---- summary */}
          <div>
            <h2 id="reviews-heading" className="display-lg mb-5">Reviews</h2>

            {count > 0 ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="font-[var(--font-display)] text-5xl font-light">{average.toFixed(1)}</span>
                  <div>
                    <Rating value={average} size={14} />
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {count} review{count === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                <ul className="mt-6 space-y-2">
                  {distribution.map((d) => (
                    <li key={d.star} className="flex items-center gap-3 text-xs">
                      <span className="w-8 shrink-0 text-[var(--text-muted)]">{d.star} ★</span>
                      <span className="h-1 flex-1 bg-[var(--border)]">
                        <span
                          className="block h-full bg-[var(--primary)]"
                          style={{ width: `${reviews.length ? (d.count / reviews.length) * 100 : 0}%` }}
                        />
                      </span>
                      <span className="w-5 shrink-0 text-right text-[var(--text-muted)]">{d.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                No reviews yet — be the first to share your thoughts.
              </p>
            )}

            <div className="mt-7">
              {user ? (
                <button type="button" className="btn btn-outline w-full" onClick={() => setShowForm((s) => !s)}>
                  {showForm ? 'Close' : 'Write a review'}
                </button>
              ) : (
                <Link to="/login" className="btn btn-outline w-full">Sign in to review</Link>
              )}
            </div>
          </div>

          {/* ---- list */}
          <div>
            {showForm && user && (
              <div className="mb-8">
                <ReviewForm
                  productId={product._id}
                  onDone={() => { setShowForm(false); refetch(); }}
                />
              </div>
            )}

            {loading ? (
              <div className="space-y-6">
                {[0, 1].map((i) => <LoadingSkeleton key={i} className="h-28 w-full" />)}
              </div>
            ) : reviews.length ? (
              <ul className="divide-y divide-[var(--border)]">
                {reviews.map((review) => (
                  <li key={review._id} className="py-6 first:pt-0">
                    <article>
                      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Rating value={review.rating} size={13} />
                        {review.isVerifiedPurchase && (
                          <span className="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-[var(--success)]">
                            <BadgeCheck size={13} aria-hidden="true" /> Verified purchase
                          </span>
                        )}
                      </div>

                      {review.title && <h3 className="text-base font-medium">{review.title}</h3>}
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{review.comment}</p>
                      <p className="mt-3 text-xs text-[var(--text-muted)]">
                        {review.name} · {formatDate(review.createdAt)}
                      </p>
                    </article>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No reviews yet"
                description="Once this piece finds its home, customer reviews will appear here."
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
