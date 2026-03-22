import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAlertStream } from '@/hooks/useAlertStream'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { pt } from 'date-fns/locale'
import { toast } from 'sonner'
import { Radio } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''
const MAX_ALERTS = 20

function ScoreBadge({ score }) {
  const s = Number(score || 0)
  const isCritical = s > 0.90
  const isWarning = s >= 0.70
  const variant = isCritical ? 'destructive' : isWarning ? 'warning' : 'outline'
  return (
    <Badge
      variant={variant}
      className={`font-mono text-xs ${isCritical ? 'animate-pulse' : ''}`}
    >
      {(s * 100).toFixed(1)}%
    </Badge>
  )
}

function timeAgo(timestamp) {
  if (!timestamp) return ''
  try {
    const d = typeof timestamp === 'string' ? parseISO(timestamp) : new Date(timestamp)
    return formatDistanceToNow(d, { addSuffix: true, locale: pt })
  } catch {
    return ''
  }
}

export function LiveAlertFeed() {
  const [alerts, setAlerts] = useState([])
  const [sseConnected, setSseConnected] = useState(false)
  const listRef = useRef(null)
  const navigate = useNavigate()
  const seenIds = useRef(new Set())

  // Seed with recent pending alerts
  const { data: seedData, isLoading } = useQuery({
    queryKey: ['feed-alerts'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/alerts?status=PENDING_REVIEW&limit=5`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: 8000,
  })

  // Initialize from seed data
  useEffect(() => {
    if (seedData?.items) {
      setAlerts(prev => {
        const existing = new Set(prev.map(a => a.transaction_id))
        const newItems = seedData.items.filter(a => !existing.has(a.transaction_id))
        if (newItems.length === 0) return prev
        // Track seen IDs
        for (const item of newItems) seenIds.current.add(item.transaction_id)
        return [...newItems, ...prev].slice(0, MAX_ALERTS)
      })
    }
  }, [seedData])

  // Handle new SSE alerts
  const handleNewAlert = useCallback((alert) => {
    if (!alert?.transaction_id) return
    // Skip duplicates
    if (seenIds.current.has(alert.transaction_id)) return
    seenIds.current.add(alert.transaction_id)

    setAlerts(prev => [alert, ...prev].slice(0, MAX_ALERTS))

    // Critical alert toast
    const score = Number(alert.anomaly_score || 0)
    if (score > 0.90) {
      const amount = Number(alert.amount || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })
      toast.error(`Alerta Crítico: €${amount}`, { duration: 8000 })
    }

    // Scroll to top
    if (listRef.current) {
      listRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  useAlertStream(handleNewAlert, false, setSseConnected)

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-muted-foreground" />
            Alertas em Tempo Real
          </span>
          {sseConnected && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div
          ref={listRef}
          className="h-[320px] overflow-y-auto space-y-2 pr-1"
        >
          {isLoading && alerts.length === 0 ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))
          ) : alerts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Sem alertas recentes
            </div>
          ) : (
            alerts.map((alert) => {
              const score = Number(alert.anomaly_score || 0)
              const isCritical = score > 0.90
              return (
                <div
                  key={alert.transaction_id}
                  className={`flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-slate-900 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    isCritical ? 'border-l-4 border-l-red-500' : ''
                  }`}
                >
                  <ScoreBadge score={alert.anomaly_score} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                      {alert.merchant_nif || alert.transaction_id?.substring(0, 12)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        €{Number(alert.amount || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </span>
                      <span>·</span>
                      <span>{timeAgo(alert.timestamp)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs shrink-0 h-7"
                    onClick={() => navigate('/alerts', { state: { alertId: alert.transaction_id } })}
                  >
                    Ver
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
