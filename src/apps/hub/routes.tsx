import { Route } from 'react-router-dom'
import { HubHome } from '@/apps/hub/pages/HubHome'
import { AuthCallback } from '@/apps/hub/pages/AuthCallback'

/** Route elements for the Hub app, mounted under /hub in App.tsx. */
export const hubRoutes = (
  <>
    <Route path="/hub" element={<HubHome />} />
    <Route path="/hub/callback" element={<AuthCallback />} />
  </>
)
