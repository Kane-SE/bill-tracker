import { createPortal } from 'react-dom'

/**
 * Fixed bottom action bar. Rendered into <body> so it stays put while the page
 * slides: a transformed ancestor would otherwise become its containing block.
 */
export function BottomBar({ children }: { children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
      <div className="mx-auto max-w-lg">{children}</div>
    </div>,
    document.body,
  )
}
