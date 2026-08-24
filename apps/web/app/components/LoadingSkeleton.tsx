// Pixel-perfect skeleton placeholders matching exact dimensions of dashboard components to guarantee 0 CLS

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="clay p-5 flex flex-col justify-between h-[130px] animate-pulse-slow">
          <div className="flex items-start justify-between">
            <div className="h-3.5 w-24 bg-[var(--color-surface-variant)] rounded-full" />
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-surface-variant)]" />
          </div>
          <div>
            <div className="h-8 w-16 bg-[var(--color-surface-variant)] rounded-lg mb-1.5" />
            <div className="h-3 w-20 bg-[var(--color-surface-variant)] rounded-full opacity-60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LiveInsightsSkeleton() {
  return (
    <div className="clay p-6 sm:p-7 animate-pulse-slow">
      <div className="h-5 w-32 bg-[var(--color-surface-variant)] rounded-full mb-2" />
      <div className="h-3 w-56 bg-[var(--color-surface-variant)] rounded-full mb-6 opacity-60" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-variant)]/60 flex flex-col justify-between h-28">
            <div className="h-3 w-28 bg-[var(--color-surface-variant)] rounded-full" />
            <div className="h-7 w-16 bg-[var(--color-surface-variant)] rounded-md" />
            <div className="h-2.5 w-36 bg-[var(--color-surface-variant)] rounded-full opacity-60" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DistributionAndCategoriesSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Distribution Skeleton */}
      <div className="lg:col-span-2 clay p-6 sm:p-7 animate-pulse-slow">
        <div className="h-5 w-48 bg-[var(--color-surface-variant)] rounded-full mb-2" />
        <div className="h-3 w-64 bg-[var(--color-surface-variant)] rounded-full mb-6 opacity-60" />
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-3 bg-[var(--color-surface-variant)] rounded" />
              <div className="flex-1 h-7 bg-[var(--color-surface-variant)]/60 rounded-[var(--radius-xs)]" />
              <div className="w-10 h-3 bg-[var(--color-surface-variant)] rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* ML Categories Skeleton */}
      <div className="clay p-6 sm:p-7 animate-pulse-slow flex flex-col justify-between">
        <div>
          <div className="h-5 w-36 bg-[var(--color-surface-variant)] rounded-full mb-2" />
          <div className="h-3 w-44 bg-[var(--color-surface-variant)] rounded-full mb-6 opacity-60" />
          <div className="flex flex-col gap-5">
            {[80, 50, 25].map((w, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-16 bg-[var(--color-surface-variant)] rounded" />
                  <div className="h-3 w-20 bg-[var(--color-surface-variant)] rounded" />
                </div>
                <div className="h-2.5 bg-[var(--color-surface-variant)]/60 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-surface-variant)] rounded-full" style={{ width: `${w}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-10 bg-[var(--color-surface-variant)]/50 rounded-[var(--radius-md)] mt-6" />
      </div>
    </div>
  );
}

export function TrendChartSkeleton() {
  return (
    <div className="clay p-6 sm:p-7 animate-pulse-slow">
      <div className="flex items-center justify-between mb-2">
        <div className="h-5 w-32 bg-[var(--color-surface-variant)] rounded-full" />
        <div className="h-7 w-40 bg-[var(--color-surface-variant)] rounded-[var(--radius-sm)]" />
      </div>
      <div className="h-3 w-48 bg-[var(--color-surface-variant)] rounded-full mb-6 opacity-60" />
      <div className="h-24 bg-[var(--color-surface-variant)]/40 rounded-[var(--radius-md)]" />
    </div>
  );
}

export function DepartmentHeatmapSkeleton() {
  return (
    <div className="clay p-6 sm:p-7 animate-pulse-slow">
      <div className="flex items-center justify-between mb-2">
        <div className="h-5 w-56 bg-[var(--color-surface-variant)] rounded-full" />
        <div className="h-8 w-28 bg-[var(--color-surface-variant)] rounded-full" />
      </div>
      <div className="h-3 w-72 bg-[var(--color-surface-variant)] rounded-full mb-6 opacity-60" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-[var(--radius-lg)] bg-[var(--color-surface-variant)]/50 p-4 border border-[var(--color-surface-variant)]" />
        ))}
      </div>
    </div>
  );
}

export function KeyDriversSkeleton() {
  return (
    <div className="clay p-6 sm:p-7 animate-pulse-slow">
      <div className="h-5 w-64 bg-[var(--color-surface-variant)] rounded-full mb-2" />
      <div className="h-3 w-80 bg-[var(--color-surface-variant)] rounded-full mb-6 opacity-60" />
      <div className="flex flex-wrap gap-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 w-28 rounded-[var(--radius-md)] bg-[var(--color-surface-variant)]" />
        ))}
      </div>
    </div>
  );
}

export function VisualAnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="clay p-6 sm:p-7 animate-pulse-slow">
        <div className="h-5 w-56 bg-[var(--color-surface-variant)] rounded-full mb-2" />
        <div className="h-3 w-64 bg-[var(--color-surface-variant)] rounded-full mb-6 opacity-60" />
        <div className="h-64 bg-[var(--color-surface-variant)]/40 rounded-[var(--radius-md)]" />
      </div>
      <div className="clay p-6 sm:p-7 animate-pulse-slow">
        <div className="h-5 w-56 bg-[var(--color-surface-variant)] rounded-full mb-2" />
        <div className="h-3 w-64 bg-[var(--color-surface-variant)] rounded-full mb-6 opacity-60" />
        <div className="h-64 bg-[var(--color-surface-variant)]/40 rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}

export function ClusteringSkeleton() {
  return (
    <div className="clay p-6 sm:p-7 animate-pulse-slow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="h-5 w-72 bg-[var(--color-surface-variant)] rounded-full mb-2" />
          <div className="h-3 w-80 bg-[var(--color-surface-variant)] rounded-full opacity-60" />
        </div>
        <div className="h-9 w-28 bg-[var(--color-surface-variant)] rounded-[var(--radius-md)]" />
      </div>
      <div className="h-20 bg-[var(--color-surface-variant)]/40 rounded-[var(--radius-md)]" />
    </div>
  );
}

export function SemanticSearchSkeleton() {
  return (
    <div className="clay p-6 sm:p-7 animate-pulse-slow">
      <div className="h-5 w-64 bg-[var(--color-surface-variant)] rounded-full mb-2" />
      <div className="h-3 w-80 bg-[var(--color-surface-variant)] rounded-full mb-6 opacity-60" />
      <div className="h-11 bg-[var(--color-surface-variant)]/60 rounded-[var(--radius-md)]" />
    </div>
  );
}

// Backward compatibility exports
export function StatCardSkeleton() {
  return <div className="clay p-5 h-[130px] bg-[var(--color-surface)] rounded-[var(--radius-xl)] animate-pulse-slow" />;
}

export function ChartSkeleton() {
  return <div className="clay p-6 h-[260px] bg-[var(--color-surface)] rounded-[var(--radius-xl)] animate-pulse-slow" />;
}

export function DeptCardSkeleton() {
  return <div className="p-4 h-28 bg-[var(--color-surface-variant)]/60 rounded-[var(--radius-lg)] animate-pulse-slow" />;
}

