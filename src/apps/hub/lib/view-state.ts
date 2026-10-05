import type { HubData, HubStatus, SectionErrors } from '@/apps/hub/store/useHubStore'

export type DashboardView = 'loading' | 'empty' | 'content'

interface ViewInput {
  status: HubStatus
  fetchedAt: number | null
  data: HubData
  errors: SectionErrors
  pendingCount: number
}

/**
 * Which body the Hub home shows.
 * - loading: no cache yet and the first refresh has not settled (an offline first load shows the grid and its banner instead).
 * - empty: a sync finished, the repo has nothing for any section, no idea is queued and no section failed.
 * - content: everything else; a failed section keeps the grid so its error card stays visible.
 */
export function dashboardView({ status, fetchedAt, data, errors, pendingCount }: ViewInput): DashboardView {
  if (!fetchedAt && status !== 'offline') return 'loading'
  const nothing = data.wip.length === 0 && data.projects.length === 0 && data.ideas.length === 0 && pendingCount === 0
  const failed = errors.now !== null || errors.projects !== null || errors.ideas !== null
  return fetchedAt && nothing && !failed ? 'empty' : 'content'
}
