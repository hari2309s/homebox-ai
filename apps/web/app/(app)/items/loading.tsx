/**
 * Shown while the items page server component is streaming. Mirrors the
 * CrudShell layout exactly: scrollable content area (order-1, max-w-2xl
 * centered) above the docked add-item form footer (order-2).
 */
export default function ItemsLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* scrollable content area */}
      <div className="order-1 flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-1 flex-col gap-6 md:mx-auto md:w-full md:max-w-2xl">
          {/* Search / filter bar skeleton */}
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
      </div>
      {/* docked add-item form footer skeleton */}
      <div className="order-2 shrink-0 border-t border-border bg-card p-4 sm:p-6">
        <div className="flex gap-2 md:mx-auto md:w-full md:max-w-2xl">
          <div className="h-10 flex-1 animate-pulse rounded-md bg-muted/20" />
          <div className="h-10 w-32 animate-pulse rounded-md bg-muted/20" />
          <div className="h-10 w-16 animate-pulse rounded-md bg-muted/20" />
        </div>
      </div>
    </div>
  );
}
