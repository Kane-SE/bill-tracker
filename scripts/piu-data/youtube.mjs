// Lists a public YouTube playlist without an API key: the playlist page holds
// the first 100 entries in `ytInitialData`, and each "load more" is a POST to
// the page's own browse endpoint with the continuation token it carries.

const HEADERS = {
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
}
const BROWSE = 'https://www.youtube.com/youtubei/v1/browse?prettyPrint=false'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function get(fetchFn, url, init) {
  const res = await fetchFn(url, init)
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${url} → HTTP ${res.status}`)
  return res
}

/** Videos (lockups) in page order, plus the last continuation token seen. */
function collect(node, videos, state) {
  if (!node || typeof node !== 'object') return
  if (node.lockupViewModel?.contentId) {
    const l = node.lockupViewModel
    videos.push({ id: l.contentId, title: l.metadata?.lockupMetadataViewModel?.title?.content ?? '' })
    return
  }
  if (node.continuationCommand?.token) {
    state.token = node.continuationCommand.token
    return
  }
  for (const key in node) collect(node[key], videos, state)
}

/**
 * Every video in a public playlist, in page order (an uploads list comes
 * newest first). Throws on an HTTP error or when the page no longer carries
 * `ytInitialData`, e.g. a consent or bot-check page.
 */
export async function listPlaylist(listId, { fetch: fetchFn = globalThis.fetch, pauseMs = 250, onPage } = {}) {
  const res = await get(fetchFn, `https://www.youtube.com/playlist?list=${listId}`, { headers: HEADERS })
  const html = await res.text()
  const data = html.match(/var ytInitialData = (\{.*?\});<\/script>/s)
  const version = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)
  if (!data || !version) throw new Error('YouTube page format changed: no ytInitialData on the playlist page')

  const videos = []
  const state = { token: null }
  const seen = new Set()
  collect(JSON.parse(data[1]), videos, state)
  let page = 1
  onPage?.(page, videos.length)
  while (state.token) {
    const continuation = state.token
    state.token = null
    // never request the same page twice: a repeated token would loop forever
    if (seen.has(continuation)) throw new Error('YouTube repeated a continuation token; the page format may have changed')
    seen.add(continuation)
    if (pauseMs) await sleep(pauseMs)
    const next = await get(fetchFn, BROWSE, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: version[1], hl: 'en' } }, continuation }),
    })
    collect(await next.json(), videos, state)
    onPage?.(++page, videos.length)
  }
  return videos
}
