import { beforeEach, describe, expect, it } from 'vitest'
import { verifyAccess } from './verify-access'
import { useAuthStore } from './useAuthStore'

const user = { login: 'kane', avatarUrl: 'https://avatars.githubusercontent.com/u/1' }

function fakeClient(getUser: () => Promise<typeof user>, checkAccess: () => Promise<boolean>) {
  return { getUser, checkAccess }
}

describe('verifyAccess', () => {
  beforeEach(() => useAuthStore.setState({ session: null, user: null, access: 'unknown' }))

  it('stores the user and access "ok" when both calls succeed', async () => {
    await verifyAccess(fakeClient(async () => user, async () => true))
    expect(useAuthStore.getState().user).toEqual(user)
    expect(useAuthStore.getState().access).toBe('ok')
  })

  it('stores access "none" when the account cannot see the hub repo', async () => {
    await verifyAccess(fakeClient(async () => user, async () => false))
    expect(useAuthStore.getState().user).toEqual(user)
    expect(useAuthStore.getState().access).toBe('none')
  })

  it('rejects and writes nothing when getUser fails, even if checkAccess succeeded', async () => {
    const failure = new Error('network down')
    await expect(verifyAccess(fakeClient(() => Promise.reject(failure), async () => true))).rejects.toBe(failure)
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().access).toBe('unknown')
  })

  it('rejects and writes nothing when checkAccess fails after getUser succeeded', async () => {
    const failure = new Error('GitHub 502')
    await expect(verifyAccess(fakeClient(async () => user, () => Promise.reject(failure)))).rejects.toBe(failure)
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().access).toBe('unknown')
  })

  it('writes nothing when the caller stopped caring before the answer came back', async () => {
    let current = true
    const done = verifyAccess(
      fakeClient(async () => user, async () => true),
      () => current,
    )
    current = false
    await expect(done).resolves.toBeUndefined()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().access).toBe('unknown')
  })
})
