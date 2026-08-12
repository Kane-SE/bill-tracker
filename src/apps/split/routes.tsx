import { Route } from 'react-router-dom'
import { SplitHome } from '@/apps/split/pages/SplitHome'
import { NightDetail } from '@/apps/split/pages/NightDetail'
import { Archive } from '@/apps/split/pages/Archive'

/** Route elements for the Split app, mounted under /split in App.tsx. */
export const splitRoutes = (
  <>
    <Route path="/split" element={<SplitHome />} />
    <Route path="/split/night/:id" element={<NightDetail />} />
    <Route path="/split/archive" element={<Archive />} />
  </>
)
