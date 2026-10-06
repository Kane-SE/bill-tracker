import { Route } from 'react-router-dom'
import { HubHome } from '@/apps/hub/pages/HubHome'
import { AuthCallback } from '@/apps/hub/pages/AuthCallback'
import { IdeaDetail } from '@/apps/hub/pages/IdeaDetail'
import { ProjectDetail } from '@/apps/hub/pages/ProjectDetail'

/** Route elements for the Hub app, mounted under /hub in App.tsx. */
export const hubRoutes = (
  <>
    <Route path="/hub" element={<HubHome />} />
    <Route path="/hub/callback" element={<AuthCallback />} />
    <Route path="/hub/ideas/:id" element={<IdeaDetail />} />
    <Route path="/hub/projects/:name" element={<ProjectDetail />} />
  </>
)
