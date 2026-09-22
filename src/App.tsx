import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Launcher } from '@/launcher/Launcher'
import { Settings } from '@/settings/Settings'
import { splitRoutes } from '@/apps/split/routes'
import { Toaster } from '@/shared/ui/sonner'

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-full py-2">
        <Routes>
          <Route path="/" element={<Launcher />} />
          <Route path="/settings" element={<Settings />} />
          {splitRoutes}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Toaster />
    </HashRouter>
  )
}
