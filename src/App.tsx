import { HashRouter, Route, Routes } from 'react-router-dom'
import { Home } from '@/pages/Home'
import { NightDetail } from '@/pages/NightDetail'
import { Archive } from '@/pages/Archive'
import { Settings } from '@/pages/Settings'
import { Toaster } from '@/components/ui/sonner'

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
