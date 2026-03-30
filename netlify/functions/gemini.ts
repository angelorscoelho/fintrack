type GeminiEvent = {
  httpMethod?: string
  body?: string | null
}

type LambdaResponse = {
  statusCode: number
  headers?: Record<string, string>
  body: string
}

function json(statusCode: number, payload: Record<string, unknown>): LambdaResponse {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }
}

export async function handler(event: GeminiEvent): Promise<LambdaResponse> {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })
  if (!process.env.GEMINI_API_KEY) {
    return json(500, { error: 'GEMINI_API_KEY nao definida nas variaveis de ambiente do sistema' })
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const messages = Array.isArray(body?.messages) ? body.messages : []
    const systemContext = body?.systemContext || {}
    const systemText = [
      'Responde sempre em portugues de Portugal.',
      `System context: ${JSON.stringify(systemContext)}`,
    ].join('\n')

    const contents = [
      { role: 'user', parts: [{ text: systemText }] },
      ...messages.map((m: { role: string, content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content || '') }],
      })),
    ]

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal: controller.signal,
      }
    )
    clearTimeout(timeout)

    const data = await res.json().catch(() => ({}))
    if (!res.ok) return json(res.status, { error: data?.error?.message || 'Gemini request failed' })
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return json(200, { reply })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return json(504, { error: 'Timeout ao contactar Gemini' })
    }
    return json(500, { error: 'Erro no proxy Gemini' })
  }
}
