// Skeleton placeholder cards shown while data loads
export function StatCardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-6 shadow-sm border border-[var(--color-surface-variant)] animate-pulse-slow">
      <div className="h-3 w-24 bg-[var(--color-surface-variant)] rounded-full mb-4" />
      <div className="h-8 w-16 bg-[var(--color-surface-variant)] rounded-full mb-2" />
      <div className="h-2.5 w-20 bg-[var(--color-surface-variant)] rounded-full opacity-60" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] p-6 shadow-sm border border-[var(--color-surface-variant)] animate-pulse-slow">
      <div className="h-3 w-40 bg-[var(--color-surface-variant)] rounded-full mb-6" />
      <div className="flex items-end gap-2 h-32">
        {[60,80,45,90,70,55,85,40,65,75].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-[var(--color-surface-variant)] rounded-t-[var(--radius-xs)]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function DeptCardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-4 border border-[var(--color-surface-variant)] animate-pulse-slow">
      <div className="h-3 w-20 bg-[var(--color-surface-variant)] rounded-full mb-3" />
      <div className="h-5 w-12 bg-[var(--color-surface-variant)] rounded-full mb-2" />
      <div className="h-2.5 w-16 bg-[var(--color-surface-variant)] rounded-full opacity-60" />
    </div>
  );
}
