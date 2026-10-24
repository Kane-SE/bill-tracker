import { useRef } from 'react'

/** Grab handle: a downward swipe of 80 px or more dismisses the sheet. Back and ✕ do too. */
export function SheetGrabber({ onDismiss }: { onDismiss(): void }) {
  const startY = useRef<number | null>(null)
  return (
    <div
      aria-hidden
      className="-mx-5 -mt-5 flex h-7 shrink-0 touch-none items-center justify-center"
      onPointerDown={(e) => {
        startY.current = e.clientY
      }}
      onPointerUp={(e) => {
        if (startY.current !== null && e.clientY - startY.current >= 80) onDismiss()
        startY.current = null
      }}
      onPointerCancel={() => {
        startY.current = null
      }}
    >
      <span className="h-1.5 w-10 rounded-full bg-border" />
    </div>
  )
}
