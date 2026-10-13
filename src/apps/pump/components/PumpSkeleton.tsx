/** Shown while the Pump chunk (page + chart data) loads. */
export function PumpSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-4" aria-busy="true" aria-label="Loading charts">
      <div className="mb-4 h-28 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="mb-2 h-14 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ))}
    </div>
  )
}
