import { HashRouter, Route, Routes } from 'react-router-dom'
import { Home } from '@/apps/split/pages/Home'
import { NightDetail } from '@/apps/split/pages/NightDetail'
import { Archive } from '@/apps/split/pages/Archive'
import { Settings } from '@/settings/Settings'
import { Toaster } from '@/shared/ui/sonner'

/**
 * HashRouter is used so deep links (e.g. /night/:id) work when the PWA is
 * opened from the home screen or served statically without server rewrites.
 */
export default function App() {
  return (
    <HashRouter>
      <div className="min-h-full py-2">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/night/:id" element={<NightDetail />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
      <Toaster />
    </HashRouter>
  )
}
