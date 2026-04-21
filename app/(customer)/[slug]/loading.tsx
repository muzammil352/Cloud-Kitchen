export default function StorefrontLoading() {
  return (
    <div className="max-w-[1200px] mx-auto min-h-screen px-4 pb-24 lg:pb-8 pt-8">
      {/* Top Bar Skeleton */}
      <div className="flex justify-between items-center mb-10 pb-4 border-b border-border">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-10 w-24 bg-muted rounded animate-pulse" />
      </div>

      {/* Category Tabs Skeleton */}
      <div className="flex gap-2 overflow-x-auto mb-8 pb-2">
        <div className="h-8 w-24 bg-muted rounded-full animate-pulse shrink-0" />
        <div className="h-8 w-32 bg-muted rounded-full animate-pulse shrink-0" />
        <div className="h-8 w-28 bg-muted rounded-full animate-pulse shrink-0" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="aspect-video w-full rounded-[calc(var(--radius))] bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-4 w-1/4 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
