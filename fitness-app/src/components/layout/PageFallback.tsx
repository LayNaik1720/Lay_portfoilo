import { SkeletonCard, SkeletonStatRow } from '../ui/Skeleton'

/** Route-level loading skeleton shown while a code-split page loads. */
export function PageFallback() {
  return (
    <div className="space-y-5">
      <SkeletonStatRow count={4} />
      <SkeletonCard className="h-64" />
      <SkeletonCard className="h-48" />
    </div>
  )
}
