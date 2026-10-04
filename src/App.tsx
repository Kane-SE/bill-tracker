import { useRef } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Launcher } from '@/launcher/Launcher'
import { Settings } from '@/settings/Settings'
import { splitRoutes } from '@/apps/split/routes'
import { Toaster } from '@/shared/ui/sonner'

type Direction = 'forward' | 'back' | null

/**
 * Slides each new screen in: deeper paths from the right, shallower from the
 * left. The direction is fixed per pathname, so re-renders don't replay it.
 */
function AnimatedRoutes() {
  const location = useLocation()
  const depth = location.pathname.split('/').filter(Boolean).length
  const nav = useRef<{ path: string; depth: number; dir: Direction }>({
    path: location.pathname,
    depth,
    dir: null,
  })
  if (nav.current.path !== location.pathname) {
    nav.current = { path: location.pathname, depth, dir: depth < nav.current.depth ? 'back' : 'forward' }
  }
  const dir = nav.current.dir

  return (
    <div key={location.pathname} className={dir ? `route route-${dir}` : 'route'}>
      <Routes location={location}>
        <Route path="/" element={<Launcher />} />
        <Route path="/settings" element={<Settings />} />
        {splitRoutes}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      {/* clip (not hidden) hides the off-screen half of a slide without making a scroll container, so sticky headers keep working */}
      <div className="min-h-full overflow-x-clip py-2">
        <AnimatedRoutes />
      </div>
      <Toaster />
    </HashRouter>
  )
}
