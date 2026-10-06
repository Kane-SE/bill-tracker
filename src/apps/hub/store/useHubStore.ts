import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '@/shared/lib/utils'
import { IDEAS_PATH, NOW_DIR, PROJECTS_PATH } from '@/apps/hub/config'
import { ConflictError, GitHubError, type GitHubClient } from '@/apps/hub/github/client'
import { AuthError } from '@/apps/hub/auth/github-auth'
import { parseNowNote } from '@/apps/hub/lib/parse-now'
import { parseProjects } from '@/apps/hub/lib/parse-projects'
import { addIdeaText, addNoteText, IdeaNotFoundError, moveStageText, parseIdeas } from '@/apps/hub/lib/ideas'
import { oneLine } from '@/apps/hub/lib/text'
import type { Idea, Project, Stage, WipCard } from '@/apps/hub/lib/types'

/**
 * Hub's cache of personal-hub files, persisted so the dashboard opens instantly and offline.
 * All writes go through writeIdeasFile: fetch fresh text, apply one edit, PUT with the sha, retry on conflict.
 */

export interface CachedFile {
  text: string
  sha: string
  etag: string | null
}

export interface PendingIdea {
  localId: string
  title: string
  note?: string
  createdOn: string
}

export type HubStatus = 'idle' | 'loading' | 'ready' | 'offline'

export interface SectionErrors {
  now: string | null
  projects: string | null
  ideas: string | null
}

export interface HubData {
  wip: WipCard[]
  projects: Project[]
  ideas: Idea[]
}

interface HubState {
  files: Record<string, CachedFile>
  nowFiles: string[]
  nowListEtag: string | null
  fetchedAt: number | null
  status: HubStatus
  errors: SectionErrors
  pending: PendingIdea[]
  refresh(client: GitHubClient, now?: number): Promise<void>
  addIdea(client: GitHubClient, input: { title: string; note?: string }, today: string): Promise<'saved' | 'queued'>
  addNote(client: GitHubClient, id: string, note: string, today: string): Promise<void>
  moveStage(client: GitHubClient, id: string, stage: Stage, today: string, why?: string): Promise<void>
  syncPending(client: GitHubClient): Promise<void>
  reset(): void
}

export const HUB_STORAGE_KEY = 'nook-hub-cache'
const NO_ERRORS: SectionErrors = { now: null, projects: null, ideas: null }

const isNetworkError = (error: unknown): boolean => error instanceof TypeError

export function describeError(error: unknown): string {
  if (error instanceof IdeaNotFoundError) return 'This idea changed elsewhere — reload.'
  if (error instanceof ConflictError) return 'ideas.md kept changing on GitHub. Try again.'
  if (error instanceof AuthError) return 'Session ended, sign in again.'
  if (isNetworkError(error)) return 'Needs connection.'
  if (error instanceof GitHubError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'Something went wrong.'
}

export function parseHubData(files: Record<string, CachedFile>, nowFiles: string[]): HubData {
  return {
    wip: nowFiles.filter((path) => files[path]).map((path) => parseNowNote(path, files[path].text)),
    projects: parseProjects(files[PROJECTS_PATH]?.text ?? null),
    ideas: parseIdeas(files[IDEAS_PATH]?.text ?? null),
  }
}

/** Fetch fresh ideas.md, apply `edit` (null = nothing to write), PUT with the sha; retry on conflict. */
export async function writeIdeasFile(
  client: GitHubClient,
  edit: (text: string | null) => string | null,
  message: string,
  maxRetries = 2,
): Promise<CachedFile> {
  for (let attempt = 0; ; attempt++) {
    const current = await client.getFile(IDEAS_PATH)
    const text = current.status === 'ok' ? current.value.text : null
    const sha = current.status === 'ok' ? current.value.sha : null
    const next = edit(text)
    if (next === null) return { text: text ?? '', sha: sha ?? '', etag: null }
    try {
      const saved = await client.putFile(IDEAS_PATH, next, sha, message)
      return { text: next, sha: saved.sha, etag: null }
    } catch (error) {
      if (error instanceof ConflictError && attempt < maxRetries) continue
      throw error
    }
  }
}

/**
 * Whether `text` already holds exactly this idea (title, Added date and note), e.g. because an earlier save landed but
 * its answer was lost or was an error. A same-titled idea with another note or day is a different idea.
 */
export function isIdeaPresent(text: string | null, item: Pick<PendingIdea, 'title' | 'note' | 'createdOn'>): boolean {
  const want = parseIdeas(addIdeaText(null, { title: item.title, note: item.note }, item.createdOn))[0] as Idea | undefined
  return want !== undefined && parseIdeas(text).some((idea) => idea.title === want.title && idea.added === want.added && idea.note === want.note)
}

/** Session gone: no token at all, or GitHub still says 401 after a refresh (the client has signed out by then). */
const isSessionEnded = (error: unknown): boolean => error instanceof AuthError || (error instanceof GitHubError && error.status === 401)

const sectionOf = (path: string): keyof SectionErrors =>
  path === PROJECTS_PATH ? 'projects' : path === IDEAS_PATH ? 'ideas' : 'now'

let syncing: Promise<void> | null = null
/** Bumped by every refresh and by reset(); a refresh that is no longer the latest drops its result. */
let generation = 0

export const useHubStore = create<HubState>()(
  persist(
    (set, get) => {
      const storeIdeas = (file: CachedFile) => set((s) => ({ files: { ...s.files, [IDEAS_PATH]: file } }))
      /** The title the cached ideas.md shows under `id` (what the user saw), or undefined when the cache does not know it. */
      const cachedTitle = (id: string): string | undefined => parseIdeas(get().files[IDEAS_PATH]?.text ?? null).find((i) => i.id === id)?.title

      const runSync = async (client: GitHubClient): Promise<void> => {
        try {
          for (const item of [...get().pending]) {
            const file = await writeIdeasFile(
              client,
              // Already there (a previous save landed but its response was lost): nothing to write.
              (text) => (isIdeaPresent(text, item) ? null : addIdeaText(text, { title: item.title, note: item.note }, item.createdOn)),
              `hub: add idea "${oneLine(item.title)}"`,
            )
            set((s) => ({ files: { ...s.files, [IDEAS_PATH]: file }, pending: s.pending.filter((p) => p.localId !== item.localId) }))
          }
        } catch (error) {
          if (!isNetworkError(error) && !isSessionEnded(error)) throw error
        }
      }

      return {
        files: {},
        nowFiles: [],
        nowListEtag: null,
        fetchedAt: null,
        status: 'idle',
        errors: NO_ERRORS,
        pending: [],

        async refresh(client, now = Date.now()) {
          const gen = ++generation
          const start = get()
          if (!start.fetchedAt) set({ status: 'loading' })
          const errors: SectionErrors = { ...NO_ERRORS }
          const files = { ...start.files }
          let nowFiles = start.nowFiles
          let nowListEtag = start.nowListEtag
          let offline = false

          try {
            const list = await client.listDir(NOW_DIR, start.nowListEtag)
            if (list.status === 'missing') {
              nowFiles = []
              nowListEtag = null
            } else if (list.status === 'ok') {
              nowFiles = list.value.filter((e) => e.type === 'file' && e.name.endsWith('.md')).map((e) => e.path).sort()
              nowListEtag = list.etag
            }
          } catch (error) {
            if (error instanceof AuthError) {
              if (gen === generation) set({ status: start.fetchedAt ? 'ready' : 'idle' })
              return
            }
            if (isNetworkError(error)) offline = true
            else errors.now = describeError(error)
          }

          if (!offline) {
            for (const path of Object.keys(files)) if (path.startsWith(`${NOW_DIR}/`) && !nowFiles.includes(path)) delete files[path]
            const paths = [...nowFiles, PROJECTS_PATH, IDEAS_PATH]
            const results = await Promise.allSettled(paths.map((path) => client.getFile(path, files[path]?.etag)))
            results.forEach((result, i) => {
              const path = paths[i]
              if (result.status === 'rejected') {
                if (isNetworkError(result.reason)) offline = true
                else if (!(result.reason instanceof AuthError)) errors[sectionOf(path)] ??= describeError(result.reason)
                return
              }
              const fetched = result.value
              if (fetched.status === 'ok') files[path] = { ...fetched.value, etag: fetched.etag }
              else if (fetched.status === 'missing') delete files[path]
            })
          }

          // A newer refresh or a reset happened meanwhile: this result is stale, drop it whole.
          if (gen !== generation) return
          if (offline) {
            set({ status: 'offline' })
            return
          }
          set((s) => {
            // A write that landed while this refresh was in flight wins over what the refresh read before it.
            const merged = { ...s.files }
            for (const path of new Set([...Object.keys(start.files), ...Object.keys(files)])) {
              if (s.files[path] !== start.files[path]) continue
              if (files[path]) merged[path] = files[path]
              else delete merged[path]
            }
            return { files: merged, nowFiles, nowListEtag, errors, status: 'ready', fetchedAt: now }
          })
        },

        async addIdea(client, input, today) {
          const title = oneLine(input.title)
          if (!title) throw new Error('Title is required')
          const note = input.note?.trim() || undefined
          const item: PendingIdea = { localId: uid(), title, note, createdOn: today }
          // Queue first: persist writes it to storage now, so a hung request or a swiped-away app cannot lose the idea.
          // A sync running meanwhile may send it too; isIdeaPresent keeps that to one copy, and removal is by localId.
          set((s) => ({ pending: [...s.pending, item] }))
          const unqueue = (s: HubState) => s.pending.filter((p) => p.localId !== item.localId)
          try {
            const file = await writeIdeasFile(client, (text) => (isIdeaPresent(text, item) ? null : addIdeaText(text, { title, note }, today)), `hub: add idea "${title}"`)
            set((s) => ({ files: { ...s.files, [IDEAS_PATH]: file }, pending: unqueue(s) }))
            return 'saved'
          } catch (error) {
            // Offline, timed out or signed out: it stays queued and syncPending sends it later.
            if (isNetworkError(error) || isSessionEnded(error)) return 'queued'
            // A failure a retry won't fix by itself: the dialog keeps the text and shows the error.
            set((s) => ({ pending: unqueue(s) }))
            throw error
          }
        },

        // Both pass the cached title, so an edit elsewhere that moved the slug to another idea stops the write instead.
        async addNote(client, id, note, today) {
          const title = cachedTitle(id)
          storeIdeas(await writeIdeasFile(client, (text) => addNoteText(text ?? '', id, note, today, title), `hub: note on "${title ?? id}"`))
        },

        async moveStage(client, id, stage, today, why) {
          const title = cachedTitle(id)
          storeIdeas(await writeIdeasFile(client, (text) => moveStageText(text ?? '', id, stage, today, why, title), `hub: move "${title ?? id}" to ${stage}`))
        },

        syncPending(client) {
          // `.finally` always runs after this assignment, even when the queue is empty and runSync settles at once.
          syncing ??= runSync(client).finally(() => {
            syncing = null
          })
          return syncing
        },

        reset() {
          generation++
          set({ files: {}, nowFiles: [], nowListEtag: null, fetchedAt: null, status: 'idle', errors: NO_ERRORS })
        },
      }
    },
    {
      name: HUB_STORAGE_KEY,
      partialize: (s) => ({ files: s.files, nowFiles: s.nowFiles, nowListEtag: s.nowListEtag, fetchedAt: s.fetchedAt, pending: s.pending }),
    },
  ),
)
