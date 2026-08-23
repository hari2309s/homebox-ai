export default function ItemDetailLoading() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 sm:p-6 md:mx-auto md:w-full md:max-w-2xl">
      {/* Back link + title row */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-muted/20" />
        <div className="h-8 w-20 animate-pulse rounded-md bg-muted/20" />
      </div>
      <div className="h-6 w-48 animate-pulse rounded bg-muted/20" />
      {/* Edit form fields */}
      <div className="flex flex-col gap-3 rounded-md border border-border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-muted/20" style={{ animationDelay: `${i * 30}ms` }} />
        ))}
      </div>
      {/* Attachments section */}
      <div className="h-32 animate-pulse rounded-md border border-border bg-muted/20" />
      {/* Maintenance section */}
      <div className="h-24 animate-pulse rounded-md border border-border bg-muted/20" />
    </div>
  );
}
