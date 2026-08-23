/**
 * Shown while the items page server component is streaming. Matches the
 * page's rough layout (search bar row + list rows) so there's no jarring
 * layout shift once the real content arrives.
 */
export default function ItemsLoading() {
  return (
    <div className="flex h-full flex-col gap-6 p-4 sm:p-6">
      {/* Search bar skeleton */}
      <div className="flex gap-2">
        <div className="h-10 flex-1 animate-pulse rounded-md bg-muted/20" />
        <div className="h-10 w-32 animate-pulse rounded-md bg-muted/20" />
        <div className="h-10 w-20 animate-pulse rounded-md bg-muted/20" />
      </div>
      {/* List rows skeleton */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-md bg-muted/20"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
