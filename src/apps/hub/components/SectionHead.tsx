import type { ReactNode } from 'react'

export function SectionHead({ title, meta, action }: { title: string; meta?: string; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex min-h-9 items-center justify-between gap-3 px-1">
      <h2 className="text-base font-semibold">
        {meta ? `${title} ` : title}
        {meta && <span className="ml-1 text-sm font-normal text-muted-foreground">{meta}</span>}
      </h2>
      {action}
    </div>
  )
}
