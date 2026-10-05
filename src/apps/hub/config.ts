import { githubAnchor } from '@/apps/hub/lib/text'

/** Build-time settings for Hub. Override with VITE_* env vars (see .env.example). */
export const HUB_REPO: string = import.meta.env.VITE_HUB_REPO || 'Kane-SE/personal-hub'
export const AUTH_BASE_URL: string = import.meta.env.VITE_AUTH_BASE_URL || '/api'
export const GITHUB_CLIENT_ID: string = import.meta.env.VITE_GITHUB_CLIENT_ID || ''

export const THRESHOLDS = {
  /** "Waiting on you" turns amber from this many days. */
  waitingAmberDays: 7,
  /** An active idea with no activity for this many days is "quiet". */
  quietDays: 21,
  /** A NOW note last worked this many days ago shows its age in amber. */
  staleDays: 14,
} as const

export type Thresholds = typeof THRESHOLDS

export const NOW_DIR = 'now'
export const PROJECTS_PATH = 'projects.md'
export const IDEAS_PATH = 'ideas.md'

export function githubRepoUrl(): string {
  return `https://github.com/${HUB_REPO}`
}

export function githubIdeaUrl(title: string): string {
  return `${githubRepoUrl()}/blob/main/${IDEAS_PATH}#${githubAnchor(title)}`
}
