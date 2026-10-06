/** Shared shapes for the Hub app. Parsers in lib/ produce these from personal-hub markdown. */

export type Stage = 'idea' | 'exploring' | 'building' | 'shipped' | 'dropped'
export const STAGES: Stage[] = ['idea', 'exploring', 'building', 'shipped', 'dropped']
/** Stages shown under the "Active" filter and eligible for "quiet" nudges. */
export const ACTIVE_STAGES: Stage[] = ['idea', 'exploring', 'building']

/** One `now/<project>.md` note. Dates are YYYY-MM-DD strings. */
export interface WipCard {
  file: string
  project: string
  lastWorked: string | null
  machine: string | null
  nextAction: string | null
  waitingOnMe: string | null
  waitingSince: string | null
  waitingOnOthers: string | null
  inFlight: string[]
  plans: string | null
}

export type ProjectStatus = 'active' | 'paused' | 'archived'

export interface Project {
  name: string
  status: ProjectStatus
  stack: string | null
  link: string | null
  summary: string | null
}

export interface ProgressNote {
  date: string
  text: string
}

export interface Idea {
  /** Slug of the heading; `-2`, `-3`… for duplicate titles in file order. */
  id: string
  title: string
  stage: Stage
  added: string | null
  note: string | null
  /** Oldest first, as written in the file. */
  progress: ProgressNote[]
}
