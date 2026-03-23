/**
 * API fetch wrapper with mock-data fallback.
 *
 * When the backend is unreachable (network error, non-OK status), safeFetch
 * returns a mock Response object so that components render demo data instead of
 * showing "Erro ao carregar dados".
 */
import { MOCK_ALERTS, MOCK_STATS } from './mockData'

let _demoMode = false

/** Returns true when the app is serving mock data instead of a live API. */
export function isDemoMode() {
  return _demoMode
}

/** Build a mock Response that mimics the backend contract for a given URL. */
function mockResponseFor(url) {
  if (url.includes('/api/stats')) {
    return MOCK_STATS
  }

  if (url.includes('/api/alerts')) {
    const u = new URL(url, 'http://localhost')
    const status = u.searchParams.get('status')
    const limit = parseInt(u.searchParams.get('limit') || '50', 10)
    let items = MOCK_ALERTS

    if (status) {
      items = items.filter((a) => a.status === status)
    }
    items = items.slice(0, limit)

    return { items, total: items.length, page: 1, page_size: limit }
  }

  return null
}

/**
 * Drop-in replacement for `fetch()` with automatic demo-data fallback.
 *
 * Usage:  const res = await safeFetch(`${API_BASE}/api/stats`)
 *         const data = await res.json()
 */
export async function safeFetch(url, options) {
  try {
    const res = await fetch(url, options)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    _demoMode = false
    return res
  } catch (err) {
    console.warn(`[safeFetch] API unreachable (${url}), using demo data:`, err.message)
    const data = mockResponseFor(url)
    if (data === null) throw new Error(`No mock data available for ${url}`)

    _demoMode = true
    return {
      ok: true,
      status: 200,
      json: async () => data,
      text: async () => JSON.stringify(data),
    }
  }
}
