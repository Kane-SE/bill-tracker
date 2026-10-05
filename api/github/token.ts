import { z } from 'zod'

/**
 * POST /api/github/token — the only server code in Nook.
 * Swaps a sign-in code (with its PKCE verifier) or a refresh token for GitHub App user tokens,
 * adding the client secret, which never reaches the browser. Stores and logs nothing.
 */

const exchangeSchema = z.object({ code: z.string().min(1), code_verifier: z.string().min(43).max(128) }).strict()
const refreshSchema = z.object({ refresh_token: z.string().min(1) }).strict()
const githubTokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number(),
  refresh_token: z.string().min(1),
  refresh_token_expires_in: z.number(),
})

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'

export interface TokenEnv {
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

export async function handleTokenRequest(request: Request, env: TokenEnv, fetchImpl: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const origin = request.headers.get('origin')
  if (origin) {
    let sameHost = false
    try {
      sameHost = new URL(origin).host === new URL(request.url).host
    } catch {
      // An Origin that is not a URL ("null", garbage) is never ours.
    }
    if (!sameHost) return json(403, { error: 'forbidden_origin' })
  }

  const clientId = env.GITHUB_CLIENT_ID
  const clientSecret = env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) return json(500, { error: 'server_not_configured' })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'invalid_json' })
  }
  const exchange = exchangeSchema.safeParse(body)
  const refresh = refreshSchema.safeParse(body)
  let grant: Record<string, string>
  if (exchange.success) grant = { code: exchange.data.code, code_verifier: exchange.data.code_verifier }
  else if (refresh.success) grant = { grant_type: 'refresh_token', refresh_token: refresh.data.refresh_token }
  else return json(400, { error: 'invalid_request' })

  let upstream: Response
  try {
    upstream = await fetchImpl(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, ...grant }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return json(502, { error: 'github_unreachable' })
  }

  // GitHub reports OAuth errors (bad code, bad refresh token) as HTTP 200 with an `error` body,
  // so a non-2xx answer means GitHub itself is failing, not that the caller's grant was rejected.
  if (!upstream.ok) return json(502, { error: 'github_error' })

  const data: unknown = await upstream.json().catch(() => null)
  const parsed = githubTokenSchema.safeParse(data)
  if (!parsed.success) {
    const error = (data as { error?: unknown } | null)?.error
    // Bad client credentials are our misconfiguration, not the caller's fault, and not theirs to see.
    if (error === 'incorrect_client_credentials') return json(500, { error: 'server_not_configured' })
    if (typeof error === 'string') return json(400, { error })
    return json(502, { error: 'bad_upstream_response' })
  }
  const { access_token, expires_in, refresh_token, refresh_token_expires_in } = parsed.data
  return json(200, { access_token, expires_in, refresh_token, refresh_token_expires_in })
}

/** Vercel Functions entry point (Web Request/Response signature). */
export function POST(request: Request): Promise<Response> {
  return handleTokenRequest(request, process.env)
}
