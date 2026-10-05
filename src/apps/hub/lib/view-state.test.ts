import { describe, expect, it } from 'vitest'
import type { HubData, SectionErrors } from '@/apps/hub/store/useHubStore'
import { dashboardView } from './view-state'

const NONE: SectionErrors = { now: null, projects: null, ideas: null }
const EMPTY: HubData = { wip: [], projects: [], ideas: [] }
const WITH_DATA: HubData = {
  wip: [],
  projects: [{ name: 'bill-splitter', status: 'active', stack: null, link: null, summary: null }],
  ideas: [{ id: 'hub', title: 'Hub', stage: 'idea', added: '2026-10-01', note: null, progress: [] }],
}
const AT = 1_791_000_000_000

describe('dashboardView', () => {
  it('shows the skeleton before the first sync when there is no cache', () => {
    expect(dashboardView({ status: 'idle', fetchedAt: null, data: EMPTY, errors: NONE, pendingCount: 0 })).toBe('loading')
  })

  it('shows the skeleton while the first refresh runs with no cache', () => {
    expect(dashboardView({ status: 'loading', fetchedAt: null, data: EMPTY, errors: NONE, pendingCount: 0 })).toBe('loading')
  })

  it('shows the grid (with its offline banner) when the first load is offline and there is no cache', () => {
    expect(dashboardView({ status: 'offline', fetchedAt: null, data: EMPTY, errors: NONE, pendingCount: 0 })).toBe('content')
  })

  it('shows the empty state when a sync found nothing and nothing failed', () => {
    expect(dashboardView({ status: 'ready', fetchedAt: AT, data: EMPTY, errors: NONE, pendingCount: 0 })).toBe('empty')
  })

  it('keeps the grid and its error card when ideas.md failed and everything else is missing', () => {
    expect(dashboardView({ status: 'ready', fetchedAt: AT, data: EMPTY, errors: { ...NONE, ideas: 'GitHub error 500' }, pendingCount: 0 })).toBe('content')
  })

  it('keeps the grid when only the now/ listing failed', () => {
    expect(dashboardView({ status: 'ready', fetchedAt: AT, data: EMPTY, errors: { ...NONE, now: 'GitHub error 500' }, pendingCount: 0 })).toBe('content')
  })

  it('keeps the grid when the repo is empty but an idea waits in the queue', () => {
    expect(dashboardView({ status: 'ready', fetchedAt: AT, data: EMPTY, errors: NONE, pendingCount: 1 })).toBe('content')
  })

  it('shows the grid when there is data', () => {
    expect(dashboardView({ status: 'ready', fetchedAt: AT, data: WITH_DATA, errors: NONE, pendingCount: 0 })).toBe('content')
  })

  it('shows the cached grid when offline after an earlier sync', () => {
    expect(dashboardView({ status: 'offline', fetchedAt: AT, data: WITH_DATA, errors: NONE, pendingCount: 0 })).toBe('content')
  })
})
