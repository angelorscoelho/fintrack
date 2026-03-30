import * as Sentry from '@sentry/react'

const GEMINI_TIMEOUT_MS = 10000

function timeoutSignal(ms) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, clear: () => window.clearTimeout(timer) }
}

function mapGeminiError(status, body) {
  if (status === 429) return 'Limite de pedidos atingido. Aguarda alguns segundos e tenta novamente.'
  if (status === 401 || status === 403) return 'Chave de API invalida. Verifica GEMINI_API_KEY.'
  if (status === 404) {
    return 'Analise AI disponivel apenas com servidor activo. Para producao, configura Netlify Functions.'
  }
  if (status >= 500) {
    return body?.error || 'Erro interno no servidor AI. Tenta novamente.'
  }
  return body?.error || `Erro inesperado (${status}).`
}

export async function requestGemini({ messages, systemContext }) {
  if (!navigator.onLine) {
    return { ok: false, error: 'Sem ligacao a internet.' }
  }

  const { signal, clear } = timeoutSignal(GEMINI_TIMEOUT_MS)
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, systemContext }),
      signal,
    })
    let data = {}
    try {
      data = await res.json()
    } catch {
      data = {}
    }

    if (!res.ok) {
      Sentry.captureMessage('Gemini proxy returned non-200', {
        level: 'error',
        extra: { status: res.status, body: data },
      })
      return { ok: false, error: mapGeminiError(res.status, data) }
    }
    return { ok: true, reply: typeof data.reply === 'string' ? data.reply : '' }
  } catch (error) {
    Sentry.captureException(error, { extra: { endpoint: '/api/gemini' } })
    if (error?.name === 'AbortError') {
      return { ok: false, error: 'O servidor nao respondeu. Tenta novamente.' }
    }
    return { ok: false, error: 'Sem ligacao a internet.' }
  } finally {
    clear()
  }
}
