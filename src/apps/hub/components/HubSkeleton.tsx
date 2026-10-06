const bar = (width: string) => <div className={`h-3 ${width} animate-pulse rounded-full bg-foreground/5 motion-reduce:animate-none`} />

export function HubSkeleton() {
  return (
    <div aria-busy="true" className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-8">
      <div className="lg:col-span-7">
        <div className="mb-2 mt-6 h-4 w-24 rounded-full bg-foreground/5" />
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {[['w-1/3', 'w-11/12', 'w-2/3'], ['w-2/5', 'w-4/5', 'w-1/2'], ['w-1/4', 'w-3/4']].map((row, i) => (
            <li key={i} className="space-y-2.5 px-4 py-4">
              {row.map((w) => <div key={w}>{bar(w)}</div>)}
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:col-span-5">
        <div className="mb-2 mt-6 h-4 w-20 rounded-full bg-foreground/5" />
        <ul className="rounded-2xl border border-border bg-card p-1">
          {['w-1/2', 'w-2/3', 'w-2/5', 'w-3/5'].map((w) => (
            <li key={w} className="flex items-start gap-3 px-3 py-3">
              <div className="flex-1 space-y-2">
                {bar(w)}
                {bar('w-1/3')}
              </div>
              <div className="h-5 w-16 rounded-full bg-foreground/5" />
            </li>
          ))}
        </ul>
      </div>
      <span className="sr-only" role="status">
        Loading your hub
      </span>
    </div>
  )
}
