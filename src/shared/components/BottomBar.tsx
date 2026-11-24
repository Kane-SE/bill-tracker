import { createPortal } from 'react-dom'
import { cn } from '@/shared/lib/utils'
import { useKeyboardInset } from '@/shared/hooks/useKeyboardInset'

interface BottomBarProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

/**
 * Fixed bottom action bar. Rendered into <body> so it stays put while the page
 * slides: a transformed ancestor would otherwise become its containing block.
 * It rides above the on-screen keyboard, which otherwise covers it on phones.
 */
export function BottomBar({ children, className, style }: BottomBarProps) {
  const inset = useKeyboardInset()
  return createPortal(
    <div
      style={inset > 0 ? { ...style, transform: `translateY(-${inset}px)` } : style}
      className={cn('fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur', className)}
    >
      <div className="mx-auto max-w-lg">{children}</div>
    </div>,
    document.body,
  )
}
