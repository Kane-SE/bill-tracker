import { beforeEach, describe, expect, it } from 'vitest'
import { ConflictError, type DirEntry, type Fetched, type GitHubClient, type RemoteFile } from '@/apps/hub/github/client'
import bill from '@/apps/hub/lib/__fixtures__/now-bill-splitter.md?raw'
import ideasMd from '@/apps/hub/lib/__fixtures__/ideas.md?raw'
import projectsMd from '@/apps/hub/lib/__fixtures__/projects.md?raw'
import { describeError, parseHubData, useHubStore, writeIdeasFile } from './useHubStore'

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
