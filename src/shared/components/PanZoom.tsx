import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

const MIN_SCALE = 1
const MAX_SCALE = 4
const TOGGLE_SCALE = 2.5
const STEP = 1.5
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_PX = 24

interface View {
  scale: number
  x: number // translation of the image centre from the box centre, px
  y: number
}
interface Size {
  w: number
  h: number
}

const FIT: View = { scale: 1, x: 0, y: 0 }

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

/** Keep the scaled image inside the box; centre it on an axis where it is smaller. */
function clampView(v: View, fit: Size, box: Size): View {
  const maxX = Math.max(0, (fit.w * v.scale - box.w) / 2)
  const maxY = Math.max(0, (fit.h * v.scale - box.h) / 2)
  return {
    scale: v.scale,
    x: Math.min(maxX, Math.max(-maxX, v.x)),
    y: Math.min(maxY, Math.max(-maxY, v.y)),
  }
}

/** Zoom to `scale`, keeping the point at `c` (px from the box centre) still. */
function zoomAt(v: View, scale: number, cx: number, cy: number): View {
  const k = scale / v.scale
  return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }
}

/**
 * A photo that fits its parent (contain) and can be pinched, double-tapped,
 * ctrl+wheeled or button-zoomed. Pointer events only; the page's own zoom is untouched.
 */
export function PanZoom({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<Size>({ w: 0, h: 0 })
  const [loaded, setNatural] = useState<(Size & { src: string }) | null>(null)
  const [view, setView] = useState<View>(FIT)
  const viewRef = useRef(view)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; mx: number; my: number } | null>(null)
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null)
  const touchToggledAt = useRef(0)

  // Only a size measured for the current src counts, so a late or early load can't go stale.
  const natural = loaded?.src === src ? loaded : null
  let fit: Size = { w: 0, h: 0 }
  if (natural && box.w > 0 && box.h > 0) {
    const k = Math.min(box.w / natural.w, box.h / natural.h)
    fit = { w: natural.w * k, h: natural.h * k }
  }
  const fitRef = useRef(fit)
  const boxSizeRef = useRef(box)
  fitRef.current = fit
  boxSizeRef.current = box

  const apply = useCallback((next: View) => {
    const v = clampView({ ...next, scale: clampScale(next.scale) }, fitRef.current, boxSizeRef.current)
    viewRef.current = v
    setView(v)
  }, [])

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // A new photo starts fitted.
  useEffect(() => {
    viewRef.current = FIT
    setView(FIT)
  }, [src])

  // Re-clamp when the box or the fitted size changes (e.g. rotation).
  useEffect(() => {
    apply(viewRef.current)
  }, [box, natural, apply])

  // Centre-relative coordinates of a client point.
  const local = (clientX: number, clientY: number) => {
    const r = boxRef.current!.getBoundingClientRect()
    return { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 }
  }

  const toggleAt = (cx: number, cy: number) => {
    const v = viewRef.current
    apply(v.scale > 1 ? FIT : zoomAt(v, TOGGLE_SCALE, cx, cy))
  }

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const c = local(e.clientX, e.clientY)
      const v = viewRef.current
      apply(zoomAt(v, clampScale(v.scale * Math.exp(-e.deltaY * 0.01)), c.x, c.y))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [apply])

  const resetPinch = () => {
    const pts = [...pointers.current.values()]
    pinch.current =
      pts.length === 2
        ? {
            dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
            mx: (pts[0].x + pts[1].x) / 2,
            my: (pts[0].y + pts[1].y) / 2,
          }
        : null
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    resetPinch()
    if (e.pointerType === 'mouse' || pointers.current.size !== 1) {
      lastTap.current = null
      return
    }
    const prev = lastTap.current
    const now = e.timeStamp
    if (prev && now - prev.t <= DOUBLE_TAP_MS && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) <= DOUBLE_TAP_PX) {
      lastTap.current = null
      touchToggledAt.current = now
      const c = local(e.clientX, e.clientY)
      toggleAt(c.x, c.y)
    } else {
      lastTap.current = { t: now, x: e.clientX, y: e.clientY }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const old = pointers.current.get(e.pointerId)
    if (!old) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const v = viewRef.current
    if (pointers.current.size === 1) {
      apply({ ...v, x: v.x + e.clientX - old.x, y: v.y + e.clientY - old.y })
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      const prev = pinch.current
      const c = local(prev.mx, prev.my)
      const z = zoomAt(v, clampScale(v.scale * (dist / prev.dist)), c.x, c.y)
      apply({ ...z, x: z.x + mx - prev.mx, y: z.y + my - prev.my })
      pinch.current = { dist, mx, my }
    }
  }

  const onPointerEnd = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    resetPinch()
  }

  const step = (factor: number) => {
    const v = viewRef.current
    apply(zoomAt(v, clampScale(v.scale * factor), 0, 0))
  }

  return (
    <div className={cn('relative overflow-hidden bg-secondary', className)}>
      <div
        ref={boxRef}
        className="absolute inset-0 touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onDoubleClick={(e) => {
          // A touch double-tap was already handled on pointerdown; browsers may also fire dblclick.
          if (e.timeStamp - touchToggledAt.current < 500) return
          const c = local(e.clientX, e.clientY)
          toggleAt(c.x, c.y)
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          ref={(img) => {
            // Already decoded (cached blob): load may have fired before React listened.
            if (img?.complete && img.naturalWidth > 0) {
              setNatural((p) =>
                p?.src === src ? p : { src, w: img.naturalWidth, h: img.naturalHeight },
              )
            }
          }}
          onLoad={(e) =>
            setNatural({ src, w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
          }
          className="absolute max-w-none"
          style={{
            width: fit.w,
            height: fit.h,
            left: (box.w - fit.w) / 2,
            top: (box.h - fit.h) / 2,
            visibility: fit.w > 0 ? 'visible' : 'hidden',
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
        />
      </div>
      <div className="absolute bottom-2 right-2 flex gap-2">
        <Button type="button" size="icon" variant="secondary" aria-label="Zoom out" onClick={() => step(1 / STEP)}>
          <ZoomOut />
        </Button>
        <Button type="button" size="icon" variant="secondary" aria-label="Zoom in" onClick={() => step(STEP)}>
          <ZoomIn />
        </Button>
        <Button type="button" size="icon" variant="secondary" aria-label="Fit" onClick={() => apply(FIT)}>
          <Maximize />
        </Button>
      </div>
    </div>
  )
}
