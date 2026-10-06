import { beforeEach, describe, expect, it } from 'vitest'
import { AuthError } from '@/apps/hub/auth/github-auth'
import { ConflictError, GitHubError, type DirEntry, type Fetched, type GitHubClient, type RemoteFile } from '@/apps/hub/github/client'
import { IdeaNotFoundError } from '@/apps/hub/lib/ideas'
import bill from '@/apps/hub/lib/__fixtures__/now-bill-splitter.md?raw'
import ideasMd from '@/apps/hub/lib/__fixtures__/ideas.md?raw'
import projectsMd from '@/apps/hub/lib/__fixtures__/projects.md?raw'
import { describeError, HUB_STORAGE_KEY, isIdeaPresent, parseHubData, useHubStore, writeIdeasFile } from './useHubStore'

/** In-memory fake repo. `offline` makes every call throw like fetch does without a network. */
function fakeRepo(initial: Record<string, string>) {
  const files = new Map(Object.entries(initial))
  let version = 0
  const state = { offline: false, conflictsLeft: 0, loseNextPutResponse: false, puts: 0, dirMissing: false }
  const guard = () => { if (state.offline) throw new TypeError('Failed to fetch') }
  const client: GitHubClient = {
    async getUser() { return { login: 'kane', avatarUrl: '' } },
    async checkAccess() { return true },
    async listDir(path): Promise<Fetched<DirEntry[]>> {
      guard()
      if (state.dirMissing) return { status: 'missing' }
      const value = [...files.keys()].filter((p) => p.startsWith(`${path}/`)).map((p) => ({ name: p.slice(path.length + 1), path: p, type: 'file' }))
      return { status: 'ok', value: [...value, { name: '.gitkeep', path: `${path}/.gitkeep`, type: 'file' }, { name: 'old', path: `${path}/old`, type: 'dir' }], etag: null }
    },
    async getFile(path): Promise<Fetched<RemoteFile>> {
      guard()
      const text = files.get(path)
      return text === undefined ? { status: 'missing' } : { status: 'ok', value: { text, sha: `v${version}` }, etag: `e${version}` }
    },
    async putFile(path, text, sha) {
      guard()
      state.puts++
      if (state.conflictsLeft > 0) { state.conflictsLeft--; files.set(path, `${files.get(path) ?? ''}\n## Edited on the PC\n`); version++; throw new ConflictError() }
      if ((files.has(path) ? `v${version}` : null) !== sha) throw new ConflictError()
      files.set(path, text)
      version++
      if (state.loseNextPutResponse) { state.loseNextPutResponse = false; throw new TypeError('Failed to fetch') }
      return { sha: `v${version}` }
    },
  }
  return { client, files, state }
}

const TODAY = '2026-10-05'

beforeEach(() => {
  useHubStore.setState({ files: {}, nowFiles: [], nowListEtag: null, fetchedAt: null, status: 'idle', errors: { now: null, projects: null, ideas: null }, pending: [] })
})

describe('refresh', () => {
  it('loads NOW notes, projects and ideas, skipping non-markdown entries in now/', async () => {
    const { client } = fakeRepo({ 'now/bill-splitter.md': bill, 'projects.md': projectsMd, 'ideas.md': ideasMd })
    await useHubStore.getState().refresh(client, 123)
    const s = useHubStore.getState()
    expect(s.status).toBe('ready')
    expect(s.fetchedAt).toBe(123)
    expect(s.nowFiles).toEqual(['now/bill-splitter.md'])
    const data = parseHubData(s.files, s.nowFiles)
    expect(data.wip.map((c) => c.project)).toEqual(['bill-splitter'])
    expect(data.projects).toHaveLength(4)
    expect(data.ideas).toHaveLength(4)
  })

  it('shows an empty Now list when now/ does not exist', async () => {
    const { client, state } = fakeRepo({ 'ideas.md': ideasMd })
    state.dirMissing = true
    await useHubStore.getState().refresh(client, 1)
    const s = useHubStore.getState()
    expect(s.status).toBe('ready')
    expect(s.errors).toEqual({ now: null, projects: null, ideas: null })
    expect(parseHubData(s.files, s.nowFiles).wip).toEqual([])
  })

  it('keeps the cached copy and goes offline when the network is down', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    await useHubStore.getState().refresh(repo.client, 1)
    repo.state.offline = true
    await useHubStore.getState().refresh(repo.client, 2)
    const s = useHubStore.getState()
    expect(s.status).toBe('offline')
    expect(s.fetchedAt).toBe(1)
    expect(parseHubData(s.files, s.nowFiles).ideas).toHaveLength(4)
  })
})

describe('writes', () => {
  it('adds a note and updates the cache', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    await useHubStore.getState().addNote(repo.client, 'photo-tagging-for-nomnoms', 'Round 5 done', TODAY)
    expect(repo.files.get('ideas.md')).toContain('- 2026-10-05 — Round 5 done')
    expect(useHubStore.getState().files['ideas.md'].text).toBe(repo.files.get('ideas.md'))
  })

  it('re-applies the edit on fresh text after a conflict, at most twice', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    repo.state.conflictsLeft = 2
    await useHubStore.getState().moveStage(repo.client, 'photo-tagging-for-nomnoms', 'building', TODAY)
    expect(repo.files.get('ideas.md')).toContain('## Edited on the PC')
    expect(repo.files.get('ideas.md')).toContain('Stage: building')

    repo.state.conflictsLeft = 3
    await expect(useHubStore.getState().addNote(repo.client, 'photo-tagging-for-nomnoms', 'x', TODAY)).rejects.toBeInstanceOf(ConflictError)
  })

  it('stops when the idea no longer exists', async () => {
    const repo = fakeRepo({ 'ideas.md': '# Ideas\n' })
    await expect(useHubStore.getState().addNote(repo.client, 'gone', 'x', TODAY)).rejects.toThrow('not found')
    expect(describeError(new ConflictError())).toBe('ideas.md kept changing on GitHub. Try again.')
  })

  it('writeIdeasFile skips the write when the edit returns null', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    const file = await writeIdeasFile(repo.client, () => null, 'm')
    expect(repo.state.puts).toBe(0)
    expect(file.text).toBe(ideasMd)
  })
})

describe('offline ideas', () => {
  it('queues an idea offline and syncs it exactly once', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    repo.state.offline = true
    expect(await useHubStore.getState().addIdea(repo.client, { title: 'Weather that changes flowers' }, TODAY)).toBe('queued')
    expect(useHubStore.getState().pending).toHaveLength(1)

    repo.state.offline = false
    await Promise.all([useHubStore.getState().syncPending(repo.client), useHubStore.getState().syncPending(repo.client)])
    expect(useHubStore.getState().pending).toEqual([])
    expect(repo.files.get('ideas.md')!.match(/## Weather that changes flowers/g)).toHaveLength(1)
  })

  it('does not duplicate an idea whose save succeeded but whose response was lost', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    repo.state.loseNextPutResponse = true
    expect(await useHubStore.getState().addIdea(repo.client, { title: 'Lost response' }, TODAY)).toBe('queued')
    await useHubStore.getState().syncPending(repo.client)
    expect(repo.files.get('ideas.md')!.match(/## Lost response/g)).toHaveLength(1)
    expect(useHubStore.getState().pending).toEqual([])
  })

  it('keeps later queued ideas when one fails mid-queue', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    useHubStore.setState({ pending: [{ localId: 'a', title: 'One', createdOn: TODAY }, { localId: 'b', title: 'Two', createdOn: TODAY }] })
    let calls = 0
    const flaky: GitHubClient = { ...repo.client, putFile: async (...args) => { if (++calls === 2) throw new TypeError('Failed to fetch'); return repo.client.putFile(...args) } }
    await useHubStore.getState().syncPending(flaky)
    expect(useHubStore.getState().pending.map((p) => p.localId)).toEqual(['b'])
  })

  it('reset clears the cache but keeps unsynced ideas', () => {
    useHubStore.setState({ files: { 'ideas.md': { text: 'x', sha: 's', etag: null } }, fetchedAt: 5, pending: [{ localId: 'a', title: 'Keep me', createdOn: TODAY }] })
    useHubStore.getState().reset()
    const s = useHubStore.getState()
    expect(s.files).toEqual({})
    expect(s.fetchedAt).toBeNull()
    expect(s.pending).toHaveLength(1)
  })
})

/** Wraps `client` so getFile(path) hands back its result (or `answer`) only after `release()`; `started` settles once that read is in flight. */
function gated(client: GitHubClient, path: string, answer?: Fetched<RemoteFile>) {
  let release!: () => void
  let reached!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  const started = new Promise<void>((resolve) => { reached = resolve })
  const wrapped: GitHubClient = {
    ...client,
    async getFile(p, etag) {
      const result = answer && p === path ? answer : await client.getFile(p, etag)
      if (p === path) { reached(); await gate }
      return result
    },
  }
  return { client: wrapped, release, started }
}

/** Wraps `client` so every putFile commit message is recorded. */
function recordingMessages(client: GitHubClient) {
  const messages: string[] = []
  const wrapped: GitHubClient = { ...client, putFile: async (path, text, sha, message) => { messages.push(message); return client.putFile(path, text, sha, message) } }
  return { client: wrapped, messages }
}

describe('syncPending single flight', () => {
  it('still syncs after an earlier call found the queue empty', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    await useHubStore.getState().syncPending(repo.client)

    repo.state.offline = true
    expect(await useHubStore.getState().addIdea(repo.client, { title: 'Queued after an empty sync' }, TODAY)).toBe('queued')
    repo.state.offline = false
    await useHubStore.getState().syncPending(repo.client)

    expect(useHubStore.getState().pending).toEqual([])
    expect(repo.files.get('ideas.md')!.match(/## Queued after an empty sync/g)).toHaveLength(1)
  })

  it('works again on a second sequential call once the first has finished', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    repo.state.offline = true
    await useHubStore.getState().addIdea(repo.client, { title: 'First queued' }, TODAY)
    repo.state.offline = false
    await useHubStore.getState().syncPending(repo.client)
    expect(useHubStore.getState().pending).toEqual([])

    repo.state.offline = true
    await useHubStore.getState().addIdea(repo.client, { title: 'Second queued' }, TODAY)
    repo.state.offline = false
    await useHubStore.getState().syncPending(repo.client)

    expect(useHubStore.getState().pending).toEqual([])
    expect(repo.files.get('ideas.md')!.match(/## First queued/g)).toHaveLength(1)
    expect(repo.files.get('ideas.md')!.match(/## Second queued/g)).toHaveLength(1)
  })
})

describe('refresh racing other writes', () => {
  it('does not revert an idea saved while the refresh was in flight (200 answer)', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    const slow = gated(repo.client, 'ideas.md')
    const refreshing = useHubStore.getState().refresh(slow.client, 1)
    await slow.started
    await useHubStore.getState().addIdea(repo.client, { title: 'Brand new' }, TODAY)
    slow.release()
    await refreshing

    const cached = useHubStore.getState().files['ideas.md'].text
    expect(cached).toContain('## Brand new')
    expect(cached).toBe(repo.files.get('ideas.md'))
  })

  it('does not revert a note saved while the refresh was in flight (304 answer)', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    await useHubStore.getState().refresh(repo.client, 1)
    const slow = gated(repo.client, 'ideas.md', { status: 'not-modified' })
    const refreshing = useHubStore.getState().refresh(slow.client, 2)
    await slow.started
    await useHubStore.getState().addNote(repo.client, 'photo-tagging-for-nomnoms', 'Saved meanwhile', TODAY)
    slow.release()
    await refreshing

    const cached = useHubStore.getState().files['ideas.md'].text
    expect(cached).toContain('Saved meanwhile')
    expect(cached).toBe(repo.files.get('ideas.md'))
  })

  it('keeps a reset that happens while a refresh is in flight', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    const slow = gated(repo.client, 'ideas.md')
    const refreshing = useHubStore.getState().refresh(slow.client, 1)
    await slow.started
    useHubStore.getState().reset()
    slow.release()
    await refreshing

    const s = useHubStore.getState()
    expect(s.files).toEqual({})
    expect(s.nowFiles).toEqual([])
    expect(s.fetchedAt).toBeNull()
    expect(s.status).toBe('idle')
  })

  it('keeps the newer refresh when an older one settles last', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    const slow = gated(repo.client, 'ideas.md')
    const older = useHubStore.getState().refresh(slow.client, 1)
    await slow.started
    repo.files.set('ideas.md', `${ideasMd}\n## Newer entry\nStage: idea\nAdded: 2026-10-05\n`)
    await useHubStore.getState().refresh(repo.client, 2)
    slow.release()
    await older

    const s = useHubStore.getState()
    expect(s.fetchedAt).toBe(2)
    expect(s.files['ideas.md'].text).toContain('## Newer entry')
  })
})

describe('queued idea text', () => {
  it('queues and dedupes a multi-line title by its one-line form, with a one-line commit message', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    const spy = recordingMessages(repo.client)
    repo.state.loseNextPutResponse = true
    expect(await useHubStore.getState().addIdea(spy.client, { title: 'Two\nlines' }, TODAY)).toBe('queued')
    const queued = useHubStore.getState().pending[0]
    await useHubStore.getState().syncPending(spy.client)

    expect(repo.files.get('ideas.md')!.match(/## Two lines/g)).toHaveLength(1)
    expect(useHubStore.getState().pending).toEqual([])
    expect(spy.messages.length).toBeGreaterThan(0)
    for (const message of spy.messages) expect(message).not.toMatch(/[\r\n]/)
    expect(spy.messages[0]).toBe('hub: add idea "Two lines"')
    expect(queued.title).toBe('Two lines')
  })

  it('rejects a title that is only whitespace', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    await expect(useHubStore.getState().addIdea(repo.client, { title: ' \n ' }, TODAY)).rejects.toThrow('Title is required')
    expect(useHubStore.getState().pending).toEqual([])
  })
})

describe('queued idea dedupe', () => {
  it('writes a queued idea that only shares title and date with a hand-written one', async () => {
    const repo = fakeRepo({ 'ideas.md': `${ideasMd}\n## Garden\nStage: idea\nAdded: ${TODAY}\n` })
    useHubStore.setState({ pending: [{ localId: 'a', title: 'Garden', note: 'With a note', createdOn: TODAY }] })
    await useHubStore.getState().syncPending(repo.client)

    expect(useHubStore.getState().pending).toEqual([])
    expect(repo.files.get('ideas.md')!.match(/## Garden/g)).toHaveLength(2)
    expect(repo.files.get('ideas.md')).toContain('With a note')
  })

  it('writes two queued ideas with the same title and day but different notes', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    useHubStore.setState({
      pending: [
        { localId: 'a', title: 'Twin', note: 'first take', createdOn: TODAY },
        { localId: 'b', title: 'Twin', note: 'second take', createdOn: TODAY },
      ],
    })
    await useHubStore.getState().syncPending(repo.client)

    expect(useHubStore.getState().pending).toEqual([])
    expect(repo.files.get('ideas.md')!.match(/## Twin/g)).toHaveLength(2)
    expect(repo.files.get('ideas.md')).toContain('first take')
    expect(repo.files.get('ideas.md')).toContain('second take')
  })

  it('does not duplicate an identical idea (title, date and note) whose first save landed', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    repo.state.loseNextPutResponse = true
    expect(await useHubStore.getState().addIdea(repo.client, { title: 'Same again', note: '- starts like a list item' }, TODAY)).toBe('queued')
    await useHubStore.getState().syncPending(repo.client)

    expect(repo.files.get('ideas.md')!.match(/## Same again/g)).toHaveLength(1)
    expect(useHubStore.getState().pending).toEqual([])
  })
})

describe('refresh edge cases', () => {
  it('isolates a failing file: the other sections still load and the error stays on its own section', async () => {
    const repo = fakeRepo({ 'now/bill-splitter.md': bill, 'projects.md': projectsMd, 'ideas.md': ideasMd })
    const client: GitHubClient = {
      ...repo.client,
      async getFile(path, etag) {
        if (path === 'ideas.md') throw new GitHubError(500, 'boom')
        return repo.client.getFile(path, etag)
      },
    }
    await useHubStore.getState().refresh(client, 1)

    const s = useHubStore.getState()
    expect(s.status).toBe('ready')
    expect(s.errors).toEqual({ now: null, projects: null, ideas: 'boom' })
    const data = parseHubData(s.files, s.nowFiles)
    expect(data.wip).toHaveLength(1)
    expect(data.projects).toHaveLength(4)
    expect(data.ideas).toEqual([])
  })

  it('sends stored ETags and keeps the cached text on a 304', async () => {
    const repo = fakeRepo({ 'now/bill-splitter.md': bill, 'ideas.md': ideasMd })
    const seen: Record<string, string | null | undefined> = {}
    let listEtag: string | null | undefined
    const client: GitHubClient = {
      ...repo.client,
      async listDir(path, etag): Promise<Fetched<DirEntry[]>> {
        listEtag = etag
        if (etag === 'L1') return { status: 'not-modified' }
        const result = await repo.client.listDir(path, etag)
        return result.status === 'ok' ? { ...result, etag: 'L1' } : result
      },
      async getFile(path, etag): Promise<Fetched<RemoteFile>> {
        seen[path] = etag
        if (etag === 'e0') return { status: 'not-modified' }
        return repo.client.getFile(path, etag)
      },
    }
    await useHubStore.getState().refresh(client, 1)
    const first = useHubStore.getState()
    expect(first.nowListEtag).toBe('L1')
    expect(first.files['ideas.md'].etag).toBe('e0')
    expect(seen['ideas.md']).toBeUndefined()

    await useHubStore.getState().refresh(client, 2)
    const second = useHubStore.getState()
    expect(listEtag).toBe('L1')
    expect(seen['ideas.md']).toBe('e0')
    expect(seen['now/bill-splitter.md']).toBe('e0')
    expect(second.status).toBe('ready')
    expect(second.fetchedAt).toBe(2)
    expect(second.nowFiles).toEqual(['now/bill-splitter.md'])
    expect(second.files['ideas.md']).toBe(first.files['ideas.md'])
    expect(second.files['now/bill-splitter.md'].text).toBe(bill)
  })

  it('drops cached NOW notes whose files vanished from now/', async () => {
    const repo = fakeRepo({ 'now/a.md': bill, 'now/b.md': bill, 'ideas.md': ideasMd })
    await useHubStore.getState().refresh(repo.client, 1)
    expect(useHubStore.getState().nowFiles).toEqual(['now/a.md', 'now/b.md'])

    repo.files.delete('now/b.md')
    await useHubStore.getState().refresh(repo.client, 2)
    const s = useHubStore.getState()
    expect(s.nowFiles).toEqual(['now/a.md'])
    expect(Object.keys(s.files).sort()).toEqual(['ideas.md', 'now/a.md'])
  })

  it('keeps the cache and reports no error when the session ended mid-refresh', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    const expired: GitHubClient = { ...repo.client, async listDir() { throw new AuthError('expired') } }

    await useHubStore.getState().refresh(expired, 1)
    expect(useHubStore.getState().status).toBe('idle')
    expect(useHubStore.getState().errors).toEqual({ now: null, projects: null, ideas: null })

    await useHubStore.getState().refresh(repo.client, 2)
    const cached = useHubStore.getState().files
    await useHubStore.getState().refresh(expired, 3)
    const s = useHubStore.getState()
    expect(s.files).toBe(cached)
    expect(s.status).toBe('ready')
    expect(s.fetchedAt).toBe(2)
    expect(s.errors).toEqual({ now: null, projects: null, ideas: null })
  })
})

describe('describeError', () => {
  it('words each failure for the UI', () => {
    expect(describeError(new IdeaNotFoundError('x'))).toBe('This idea changed elsewhere — reload.')
    expect(describeError(new AuthError('expired'))).toBe('Session ended, sign in again.')
    expect(describeError(new TypeError('Failed to fetch'))).toBe('Needs connection.')
    expect(describeError(new GitHubError(500, 'boom'))).toBe('boom')
    expect(describeError(new Error('plain'))).toBe('plain')
    expect(describeError('nope')).toBe('Something went wrong.')
  })
})

describe('a file too large to read', () => {
  it('surfaces the 413 from addIdea instead of queuing or writing', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    let gets = 0
    const client: GitHubClient = {
      ...repo.client,
      async getFile() { gets++; throw new GitHubError(413, 'ideas.md is too large to load') },
    }
    await expect(useHubStore.getState().addIdea(client, { title: 'Too late' }, TODAY)).rejects.toBeInstanceOf(GitHubError)
    expect(useHubStore.getState().pending).toEqual([])
    expect(gets).toBe(1)
    expect(repo.state.puts).toBe(0)
  })
})

/** What persist wrote to storage for the queue. */
const storedPending = () => JSON.parse(localStorage.getItem(HUB_STORAGE_KEY)!).state.pending as { title: string }[]

describe('a new idea is on this device before any network call', () => {
  it('queues and stores the idea while the save is still in flight, then drops it from the queue once the save lands', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    let reads = 0
    // A "connected but dead" connection: the read hangs until the test lets it through.
    const hung: GitHubClient = { ...repo.client, async getFile(path, etag) { reads++; await gate; return repo.client.getFile(path, etag) } }

    const saving = useHubStore.getState().addIdea(hung, { title: 'Hung save', note: 'still here' }, TODAY)
    expect(reads).toBe(1)
    expect(useHubStore.getState().pending).toMatchObject([{ title: 'Hung save', note: 'still here', createdOn: TODAY }])
    expect(storedPending()).toMatchObject([{ title: 'Hung save', note: 'still here', createdOn: TODAY }])

    release()
    expect(await saving).toBe('saved')
    expect(useHubStore.getState().pending).toEqual([])
    expect(storedPending()).toEqual([])
    expect(repo.files.get('ideas.md')!.match(/## Hung save/g)).toHaveLength(1)
    expect(useHubStore.getState().files['ideas.md'].text).toBe(repo.files.get('ideas.md'))
  })

  it('sends the idea once when a sync picks it up while the save hangs (sync writes first)', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const hung: GitHubClient = { ...repo.client, async getFile(path, etag) { await gate; return repo.client.getFile(path, etag) } }

    const saving = useHubStore.getState().addIdea(hung, { title: 'Raced' }, TODAY)
    await useHubStore.getState().syncPending(repo.client)
    expect(useHubStore.getState().pending).toEqual([])
    release()

    expect(await saving).toBe('saved')
    expect(repo.files.get('ideas.md')!.match(/## Raced/g)).toHaveLength(1)
    expect(repo.state.puts).toBe(1)
    expect(useHubStore.getState().pending).toEqual([])
  })

  it('sends the idea once when the save read the file before a sync wrote it (conflict, then already there)', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    const slow = gated(repo.client, 'ideas.md')
    const saving = useHubStore.getState().addIdea(slow.client, { title: 'Raced after read' }, TODAY)
    await slow.started
    await useHubStore.getState().syncPending(repo.client)
    slow.release()

    expect(await saving).toBe('saved')
    expect(repo.files.get('ideas.md')!.match(/## Raced after read/g)).toHaveLength(1)
    expect(useHubStore.getState().pending).toEqual([])
  })

  it('keeps the idea queued when the session ended during the save, and syncs it after signing in again', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    const expired: GitHubClient = { ...repo.client, async getFile() { throw new AuthError('expired') } }
    expect(await useHubStore.getState().addIdea(expired, { title: 'After the session ended' }, TODAY)).toBe('queued')
    expect(useHubStore.getState().pending).toMatchObject([{ title: 'After the session ended' }])
    expect(storedPending()).toMatchObject([{ title: 'After the session ended' }])

    await useHubStore.getState().syncPending(repo.client)
    expect(useHubStore.getState().pending).toEqual([])
    expect(repo.files.get('ideas.md')!.match(/## After the session ended/g)).toHaveLength(1)
  })

  it('keeps the idea queued when GitHub still answers 401 after a refresh (the client signs out)', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    const rejected: GitHubClient = { ...repo.client, async getFile() { throw new GitHubError(401, 'Could not load ideas.md') } }
    expect(await useHubStore.getState().addIdea(rejected, { title: 'Still rejected' }, TODAY)).toBe('queued')
    expect(useHubStore.getState().pending).toMatchObject([{ title: 'Still rejected' }])
  })

  it('a sync that GitHub still rejects with 401 keeps the queue and raises no error', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    useHubStore.setState({ pending: [{ localId: 'a', title: 'Waiting', createdOn: TODAY }] })
    const rejected: GitHubClient = { ...repo.client, async getFile() { throw new GitHubError(401, 'Could not load ideas.md') } }
    await expect(useHubStore.getState().syncPending(rejected)).resolves.toBeUndefined()
    expect(useHubStore.getState().pending.map((p) => p.localId)).toEqual(['a'])
  })

  it('keeps the idea queued after a timeout (a TypeError from the client)', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    const timedOut: GitHubClient = { ...repo.client, async getFile() { throw new TypeError('Request timed out') } }
    expect(await useHubStore.getState().addIdea(timedOut, { title: 'Timed out' }, TODAY)).toBe('queued')
    expect(storedPending()).toMatchObject([{ title: 'Timed out' }])
  })

  it('drops the queued copy and rethrows when the file keeps changing (conflict after the retries)', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    repo.state.conflictsLeft = 3
    await expect(useHubStore.getState().addIdea(repo.client, { title: 'Contested' }, TODAY)).rejects.toBeInstanceOf(ConflictError)
    expect(useHubStore.getState().pending).toEqual([])
    expect(storedPending()).toEqual([])
  })

  it('drops the queued copy and rethrows on a server error', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    const failing: GitHubClient = { ...repo.client, async putFile() { throw new GitHubError(500, 'Could not save ideas.md') } }
    await expect(useHubStore.getState().addIdea(failing, { title: 'Server down' }, TODAY)).rejects.toBeInstanceOf(GitHubError)
    expect(useHubStore.getState().pending).toEqual([])
    expect(storedPending()).toEqual([])
  })

  it('removes only its own item from the queue', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    useHubStore.setState({ pending: [{ localId: 'older', title: 'Queued earlier', createdOn: TODAY }] })
    const failing: GitHubClient = { ...repo.client, async putFile() { throw new GitHubError(500, 'Could not save ideas.md') } }
    await expect(useHubStore.getState().addIdea(failing, { title: 'Server down' }, TODAY)).rejects.toBeInstanceOf(GitHubError)
    expect(useHubStore.getState().pending.map((p) => p.localId)).toEqual(['older'])
    expect(await useHubStore.getState().addIdea(repo.client, { title: 'Saved fine' }, TODAY)).toBe('saved')
    expect(useHubStore.getState().pending.map((p) => p.localId)).toEqual(['older'])
  })
})

describe('an online save that landed but then failed', () => {
  it('does not write a second copy when the same idea is saved again from the dialog', async () => {
    const repo = fakeRepo({ 'ideas.md': ideasMd })
    let failNextAnswer = true
    // The commit lands, then the answer is a server error (not a network error): the dialog keeps the text.
    const flaky: GitHubClient = {
      ...repo.client,
      async putFile(path, text, sha, message) {
        const saved = await repo.client.putFile(path, text, sha, message)
        if (failNextAnswer) {
          failNextAnswer = false
          throw new GitHubError(502, 'Could not save ideas.md')
        }
        return saved
      },
    }
    const input = { title: 'Landed anyway', note: 'with a note' }
    await expect(useHubStore.getState().addIdea(flaky, input, TODAY)).rejects.toBeInstanceOf(GitHubError)
    expect(useHubStore.getState().pending).toEqual([])

    expect(await useHubStore.getState().addIdea(flaky, input, TODAY)).toBe('saved')
    expect(repo.files.get('ideas.md')!.match(/## Landed anyway/g)).toHaveLength(1)
    expect(repo.state.puts).toBe(1)
    expect(useHubStore.getState().files['ideas.md'].text).toBe(repo.files.get('ideas.md'))
    expect(useHubStore.getState().pending).toEqual([])
  })

  it('still writes a same-titled idea with a different note', async () => {
    const repo = fakeRepo({ 'ideas.md': `${ideasMd}\n## Garden\nStage: idea\nAdded: ${TODAY}\n\n- ${TODAY} — Idea captured\n` })
    expect(await useHubStore.getState().addIdea(repo.client, { title: 'Garden', note: 'A different take' }, TODAY)).toBe('saved')
    expect(repo.files.get('ideas.md')!.match(/## Garden/g)).toHaveLength(2)
  })
})

describe('isIdeaPresent', () => {
  const item = { title: 'Same again', note: '- starts like a list item', createdOn: TODAY }
  it('finds an idea written from the same title, note and day, and nothing else', () => {
    const written = `${ideasMd}\n## Same again\nStage: idea\nAdded: ${TODAY}\n\n\\- starts like a list item\n\n- ${TODAY} — Idea captured\n`
    expect(isIdeaPresent(written, item)).toBe(true)
    expect(isIdeaPresent(written, { ...item, note: undefined })).toBe(false)
    expect(isIdeaPresent(written, { ...item, createdOn: '2026-10-06' })).toBe(false)
    expect(isIdeaPresent(ideasMd, item)).toBe(false)
    expect(isIdeaPresent(null, item)).toBe(false)
  })
})
