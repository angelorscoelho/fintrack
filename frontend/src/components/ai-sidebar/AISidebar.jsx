import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Send, X } from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'
import { useLanguage } from '@/i18n/LanguageContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useTransactionData } from '@/hooks/useTransactionData'
import { requestGemini } from '@/lib/aiApi'

function nextId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function AISidebarFab() {
  const { toggle } = useSidebar()
  const { t } = useLanguage()

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'fixed right-4 bottom-8 z-50 flex h-14 w-14 items-center justify-center',
        'rounded-full bg-primary text-primary-foreground shadow-lg',
        'ring-offset-background transition hover:bg-primary/90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
      aria-label={t('aiSidebar.openAssistant')}
    >
      <Bot className="h-7 w-7" aria-hidden="true" />
    </button>
  )
}

export function AISidebar() {
  const { isOpen, toggle, currentContext, consumeQueuedPrompt } = useSidebar()
  const { t } = useLanguage()
  const { data } = useTransactionData()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lastError, setLastError] = useState('')
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev
      return [{ id: 'welcome', role: 'assistant', content: t('aiSidebar.welcome') }]
    })
  }, [t])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isLoading])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }, [input])

  const buildHistoryForApi = useCallback((priorMessages) => {
    return priorMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(({ role, content }) => ({ role, content }))
  }, [])

  const buildSystemContext = useCallback(() => {
    const alerts = Array.isArray(data?.alerts) ? data.alerts : []
    const stats = data?.stats || {}
    const totalTransactions = Number(stats.total ?? alerts.length ?? 0)
    const confirmedFraud = Number(stats.confirmed_fraud ?? 0)
    const fallbackConfirmed = Number(stats.fraud_rate ?? 0) * totalTransactions
    const fraudRate = totalTransactions > 0
      ? Number((((confirmedFraud || fallbackConfirmed) / totalTransactions) * 100).toFixed(2))
      : 0
    const criticalUnreviewed = alerts.filter(
      (a) => a?.status === 'PENDING_REVIEW' && Number(a?.anomaly_score ?? 0) >= 0.9
    ).length
    const topAnomalies = [...alerts]
      .sort((a, b) => Number(b?.anomaly_score ?? 0) - Number(a?.anomaly_score ?? 0))
      .slice(0, 5)
      .map((a) => ({
        id: a?.transaction_id ?? '—',
        score: Number((Number(a?.anomaly_score ?? 0) * 100).toFixed(2)),
        amount: Number(a?.amount ?? 0),
      }))

    return {
      kpis: { totalTransactions, fraudRate, criticalUnreviewed },
      topAnomalies,
      sidebarContext: currentContext ?? null,
    }
  }, [currentContext, data])

  const sendText = useCallback(
    async (text) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      const userMsg = { id: nextId(), role: 'user', content: trimmed }
      const historyPayload = buildHistoryForApi(messages)

      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setIsLoading(true)
      setLastError('')

      const payloadMessages = [...historyPayload, { role: 'user', content: trimmed }]
      const apiResult = await requestGemini({
        messages: payloadMessages,
        systemContext: buildSystemContext(),
      })

      if (!apiResult.ok) {
        setLastError(apiResult.error || t('aiSidebar.errorConnect'))
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'assistant', content: apiResult.error || t('aiSidebar.errorConnect') },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'assistant', content: apiResult.reply || t('aiSidebar.emptyReply') },
        ])
      }
      setIsLoading(false)
    },
    [buildHistoryForApi, buildSystemContext, isLoading, messages, t]
  )

  useEffect(() => {
    if (!isOpen || isLoading) return
    const queuedPrompt = consumeQueuedPrompt()
    if (typeof queuedPrompt === 'string' && queuedPrompt.trim()) sendText(queuedPrompt)
  }, [consumeQueuedPrompt, isLoading, isOpen, sendText])

  const onSubmit = useCallback((e) => {
    e.preventDefault()
    sendText(input)
  }, [input, sendText])

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendText(input)
    }
  }

  const showSuggestions = messages.filter((m) => m.role === 'user').length === 0 && !isLoading

  return (
    <div className="flex h-full min-h-0 flex-col bg-card text-card-foreground" aria-hidden={!isOpen}>
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Bot className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate text-sm font-semibold">{t('aiSidebar.title')}</span>
        </div>
        <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={toggle} aria-label={t('actions.close')}>
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'max-w-[85%] rounded-lg px-3 py-2 text-sm',
              m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'mr-auto bg-muted text-foreground'
            )}
          >
            {m.content}
          </div>
        ))}
        {isLoading ? (
          <div className="mr-auto flex max-w-[85%] items-center gap-1 rounded-lg bg-muted px-3 py-3 text-foreground" aria-live="polite" aria-busy="true">
            <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground/70" />
            <span className="typing-dot animation-delay-200 h-2 w-2 rounded-full bg-muted-foreground/70" />
            <span className="typing-dot animation-delay-400 h-2 w-2 rounded-full bg-muted-foreground/70" />
          </div>
        ) : null}
        {!isLoading && lastError ? <p className="px-1 text-xs text-destructive">{lastError}</p> : null}
      </div>

      {showSuggestions ? (
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-border px-3 py-2">
          <button
            type="button"
            className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-foreground hover:bg-accent"
            onClick={() => sendText('Resume os alertas criticos actuais. Usa bullet points. Se conciso e directo.')}
          >
            {t('aiSidebar.suggestionSummarise')}
          </button>
          <button
            type="button"
            className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-foreground hover:bg-accent"
            onClick={() => sendText(t('aiSidebar.suggestionRisk'))}
          >
            {t('aiSidebar.suggestionRisk')}
          </button>
          <button
            type="button"
            className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-foreground hover:bg-accent"
            onClick={() => sendText(t('aiSidebar.suggestionAnomaly'))}
          >
            {t('aiSidebar.suggestionAnomaly')}
          </button>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex shrink-0 gap-2 border-t border-border p-3">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('aiSidebar.inputPlaceholder')}
          className={cn(
            'max-h-[200px] min-h-[40px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
          disabled={isLoading}
          aria-label={t('aiSidebar.inputPlaceholder')}
        />
        <Button type="submit" disabled={isLoading || !input.trim()} aria-label={t('aiSidebar.send')}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

      <style>{`
        @keyframes ai-sidebar-pulse {
          0%, 100% { opacity: 0.35; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }
        .typing-dot { animation: ai-sidebar-pulse 1s ease-in-out infinite; }
        .typing-dot.animation-delay-200 { animation-delay: 0.2s; }
        .typing-dot.animation-delay-400 { animation-delay: 0.4s; }
      `}</style>
    </div>
  )
}
