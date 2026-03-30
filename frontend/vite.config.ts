import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

const thresholdsRaw = readFileSync(
  path.resolve(__dirname, '../shared/project_constants.json'),
  'utf-8'
)

function geminiProxyPlugin(): Plugin {
  return {
    name: 'gemini-server-proxy',
    configureServer(server) {
      server.middlewares.use('/api/gemini', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }
        if (!process.env.GEMINI_API_KEY) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'GEMINI_API_KEY nao definida nas variaveis de ambiente do sistema' }))
          return
        }

        let raw = ''
        req.on('data', (chunk) => { raw += chunk })
        req.on('end', async () => {
          try {
            const body = JSON.parse(raw || '{}')
            const messages = Array.isArray(body?.messages) ? body.messages : []
            const systemContext = body?.systemContext || {}
            const systemText = [
              'Responde sempre em portugues de Portugal.',
              'Usa contexto do dashboard quando existir.',
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
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents }),
                signal: controller.signal,
              }
            )
            clearTimeout(timeout)
            const json = await geminiRes.json().catch(() => ({}))
            if (!geminiRes.ok) {
              res.statusCode = geminiRes.status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: json?.error?.message || 'Gemini request failed' }))
              return
            }
            const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text || ''
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ reply }))
          } catch (error) {
            const status = error instanceof Error && error.name === 'AbortError' ? 504 : 500
            res.statusCode = status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: status === 504 ? 'Timeout ao contactar Gemini' : 'Erro no proxy Gemini' }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  base: '/poc/fintrack/',
  plugins: [react(), geminiProxyPlugin()],
  define: {
    __THRESHOLDS__: thresholdsRaw,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
})
