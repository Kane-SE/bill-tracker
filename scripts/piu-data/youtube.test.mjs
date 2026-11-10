import { describe, expect, it, vi } from 'vitest'
import { listPlaylist } from './youtube.mjs'

const lockup = (id, title) => ({ lockupViewModel: { contentId: id, metadata: { lockupMetadataViewModel: { title: { content: title } } } } })
const initialData = {
  contents: {
    items: [lockup('a1', 'First'), lockup('a2', 'Second'), { continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token: 'T1' } } } }],
  },
}
const pageHtml = `<html><script>ytcfg.set({"INNERTUBE_CLIENT_VERSION":"2.20261101.00.00"});</script><script>var ytInitialData = ${JSON.stringify(initialData)};</script></html>`
const more = { onResponseReceivedActions: [{ appendContinuationItemsAction: { continuationItems: [lockup('a3', 'Third')] } }] }

const ok = (body) => ({ ok: true, status: 200, text: async () => body, json: async () => JSON.parse(body) })
const page = (html) => vi.fn(async () => ok(html))
const status = (code) => vi.fn(async () => ({ ok: false, status: code, text: async () => '', json: async () => ({}) }))

describe('listPlaylist', () => {
  it('walks the page and its continuations in order', async () => {
    const fake = vi.fn(async (url) => (url.startsWith('https://www.youtube.com/playlist?list=L1') ? ok(pageHtml) : ok(JSON.stringify(more))))
    expect(await listPlaylist('L1', { fetch: fake, pauseMs: 0 })).toEqual([
      { id: 'a1', title: 'First' },
      { id: 'a2', title: 'Second' },
      { id: 'a3', title: 'Third' },
    ])
    expect(fake.mock.calls[1][0]).toBe('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false')
    const body = JSON.parse(fake.mock.calls[1][1].body)
    expect(body).toMatchObject({ continuation: 'T1', context: { client: { clientName: 'WEB', clientVersion: '2.20261101.00.00' } } })
    expect(fake).toHaveBeenCalledTimes(2)
  })

  it('throws when the page has no ytInitialData', async () => {
    await expect(listPlaylist('L1', { fetch: page('<html>consent</html>'), pauseMs: 0 })).rejects.toThrow('YouTube page format changed')
  })

  it('throws on an HTTP error', async () => {
    await expect(listPlaylist('L1', { fetch: status(429), pauseMs: 0 })).rejects.toThrow('HTTP 429')
  })
})
