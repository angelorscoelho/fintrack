import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/i18n/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TransactionDetailModal } from '@/components/transactions/TransactionDetailModal'
import { useAlertStream } from '@/hooks/useAlertStream'
import { toast } from 'sonner'
import { Radio, Info, CheckCircle } from 'lucide-react'
import { safeFetch } from '@/lib/api'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { XAI_THRESHOLD, SAR_THRESHOLD, API_MAX_LIMIT, LIVE_ALERT_FEED_MAX_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { CardAIButton } from '@/components/ai-sidebar/CardAIButton'

const API_BASE = import.meta.env.VITE_API_URL || ''

const EXCLUDED_STATUSES = new Set(['NORMAL', 'RESOLVED', 'FALSE_POSITIVE'])

function isHighRiskPending(alert) {
  if (!alert?.transaction_id) return false
  const st = alert.status
  if (EXCLUDED_STATUSES.has(st)) return false
  if (st !== 'PENDING_REVIEW') return false
  const score = Number(alert.anomaly_score ?? 0)
  return score >= XAI_THRESHOLD
}

function tsValue(timestamp) {
  if (!timestamp) return 0
  try {
    const d = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp)
    const n = d.getTime()
    return Number.isNaN(n) ? 0 : n
  } catch {
    return 0
  }
}

function sortAlerts(a, b) {
  const sa = Number(a.anomaly_score ?? 0)
  const sb = Number(b.anomaly_score ?? 0)
  if (sb !== sa) return sb - sa
  return tsValue(b.timestamp) - tsValue(a.timestamp)
}

function abbreviateTxId(id) {
  if (!id || typeof id !== 'string') return '—'
  if (id.length <= 14) return id
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

function isCriticalTier(score) {
  return Number(score ?? 0) >= SAR_THRESHOLD
}

function isSuspiciousTier(score) {
  const s = Number(score ?? 0)
  return s >= XAI_THRESHOLD && s < SAR_THRESHOLD
}

function TierScoreBadge({ score }) {
  const s = Number(score ?? 0)
  if (isCriticalTier(s)) {
    return (
      <Badge variant="destructive" className="shrink-0 font-mono text-xs">
        {(s * 100).toFixed(1)}%
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="shrink-0 border-transparent bg-[hsl(var(--high-risk-suspicious))] font-mono text-xs text-[hsl(var(--high-risk-suspicious-foreground))]"
    >
      {(s * 100).toFixed(1)}%
    </Badge>
  )
}

export function LiveAlertFeed() {
  const { t } = useLanguage()
  const [alerts, setAlerts] = useState([])
  const [sseConnected, setSseConnected] = useState(false)
  const [selectedTx, setSelectedTx] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [showCritical, setShowCritical] = useState(true)
  const [showSuspicious, setShowSuspicious] = useState(true)
  const listRef = useRef(null)
  const seenIds = useRef(new Set())

  const { data: seedData, isLoading } = useQuery({
    queryKey: ['feed-alerts'],
    queryFn: async () => {
      const res = await safeFetch(`${API_BASE}/api/alerts?status=PENDING_REVIEW&limit=${API_MAX_LIMIT}`)
      return res.json()
    },
    refetchInterval: 8000,
  })

  useEffect(() => {
    if (!seedData?.items) return
    setAlerts((prev) => {
      const byId = new Map(prev.map((a) => [a.transaction_id, a]))
      for (const item of seedData.items) {
        if (!isHighRiskPending(item)) continue
        byId.set(item.transaction_id, item)
        seenIds.current.add(item.transaction_id)
      }
      return Array.from(byId.values()).sort(sortAlerts)
    })
  }, [seedData])

  const handleNewAlert = useCallback((alert) => {
    if (!isHighRiskPending(alert)) return
    if (seenIds.current.has(alert.transaction_id)) return
    seenIds.current.add(alert.transaction_id)

    setAlerts((prev) => {
      const next = [alert, ...prev.filter((a) => a.transaction_id !== alert.transaction_id)]
      next.sort(sortAlerts)
      return next.slice(0, LIVE_ALERT_FEED_MAX_ITEMS)
    })

    const score = Number(alert.anomaly_score ?? 0)
    if (score >= SAR_THRESHOLD) {
      const amount = Number(alert.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
      toast.error(t('dashboard.criticalAlert', { amount }), { duration: 8000 })
    }

    if (listRef.current) {
      listRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [t])

  useAlertStream(handleNewAlert, false, setSseConnected)

  const eligible = useMemo(
    () => alerts.filter(isHighRiskPending).sort(sortAlerts),
    [alerts]
  )

  const visible = useMemo(() => {
    return eligible.filter((a) => {
      const s = Number(a.anomaly_score ?? 0)
      if (isCriticalTier(s)) return showCritical
      if (isSuspiciousTier(s)) return showSuspicious
      return false
    })
  }, [eligible, showCritical, showSuspicious])

  const displayList = useMemo(() => visible.slice(0, LIVE_ALERT_FEED_MAX_ITEMS), [visible])

  const highRiskAiContext = useMemo(
    () => ({
      card: 'high_risk_alerts',
      alerts: eligible.slice(0, 5).map((a) => ({
        id: a.transaction_id,
        amount: a.amount,
        anomaly_score: a.anomaly_score,
        status: a.status,
      })),
    }),
    [eligible]
  )

  const chipClass = (active) =>
    cn(
      'h-8 shrink-0 gap-1 rounded-md border px-2.5 text-xs font-medium transition-opacity',
      active
        ? 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]'
        : 'border-dashed border-[hsl(var(--border))] bg-transparent text-[hsl(var(--muted-foreground))] opacity-50 hover:opacity-70'
    )

  const openDetail = useCallback((tx) => {
    setSelectedTx(tx)
    setModalOpen(true)
  }, [])

  return (
    <TooltipProvider delayDuration={400}>
      <Card
        className={cn(
          'relative flex flex-col',
          '[--high-risk-suspicious:25_95%_47%] [--high-risk-suspicious-foreground:0_0%_100%]',
          'dark:[--high-risk-suspicious:32_92%_52%] dark:[--high-risk-suspicious-foreground:0_0%_98%]'
        )}
      >
        <CardAIButton context={highRiskAiContext} label="High Risk Transactions" />
        <CardHeader className="space-y-3 pb-2">
          <CardTitle className="flex flex-col gap-2 text-sm font-semibold sm:flex-row sm:items-start sm:justify-between">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="flex items-center gap-2">
                <Radio className="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                {t('dashboard.highRiskTransactions')}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 shrink-0 cursor-help text-[hsl(var(--muted-foreground))]" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>{t('dashboard.highRiskTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </span>
              <span className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-2 py-0.5 font-mono text-xs text-[hsl(var(--muted-foreground))] tabular-nums">
                {visible.length}
              </span>
            </span>
            {sseConnected && (
              <span className="relative flex h-2.5 w-2.5 shrink-0 self-end sm:self-start">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
            )}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={chipClass(showCritical)}
              aria-pressed={showCritical}
              onClick={() => setShowCritical((v) => !v)}
            >
              {t('dashboard.filterCriticalChip')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={chipClass(showSuspicious)}
              aria-pressed={showSuspicious}
              onClick={() => setShowSuspicious((v) => !v)}
            >
              {t('dashboard.filterSuspiciousChip')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div ref={listRef} className="h-[320px] space-y-2 overflow-y-auto pr-1">
            {isLoading && alerts.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : eligible.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center text-sm text-[hsl(var(--muted-foreground))]">
                <CheckCircle className="h-8 w-8 text-[hsl(142_76%_36%)] dark:text-[hsl(142_71%_45%)]" />
                <p>{t('dashboard.highRiskEmpty')}</p>
              </div>
            ) : displayList.length === 0 ? (
              <div className="flex h-full items-center justify-center px-2 text-center text-sm text-[hsl(var(--muted-foreground))]">
                {t('dashboard.highRiskFilterNoMatch')}
              </div>
            ) : (
              displayList.map((alert) => {
                const s = Number(alert.anomaly_score ?? 0)
                const critical = isCriticalTier(s)
                return (
                  <div
                    key={alert.transaction_id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 transition-colors hover:bg-[hsl(var(--accent))]',
                      critical && 'border-l-4 border-l-[hsl(var(--destructive))]'
                    )}
                  >
                    <span
                      className="min-w-0 flex-1 font-mono text-xs text-[hsl(var(--foreground))]"
                      title={alert.transaction_id}
                    >
                      {abbreviateTxId(alert.transaction_id)}
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-[hsl(var(--foreground))]">
                      €
                      {Number(alert.amount ?? 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    <TierScoreBadge score={alert.anomaly_score} />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 text-xs text-[hsl(var(--foreground))]"
                          aria-label={t('dashboard.viewDetails')}
                          onClick={() => openDetail(alert)}
                        >
                          {t('actions.view')}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{t('dashboard.viewDetails')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      <TransactionDetailModal
        transaction={selectedTx}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setSelectedTx(null)
        }}
      />
    </TooltipProvider>
  )
}
