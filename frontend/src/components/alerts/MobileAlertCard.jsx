import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSwipeable } from 'react-swipeable'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Loader2, Clock, CheckCircle2, CircleDot, Check, PauseCircle, XCircle, ArrowUpCircle, Cpu, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { formatSourceDestination } from '@/lib/formatTransaction'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { getScoreVariant } from '@/lib/constants'
import { useLanguage } from '@/i18n/LanguageContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

function formatTimestamp(timestamp) {
  if (!timestamp) return '–'
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: pt })
  } catch {
    return '–'
  }
}

const STATUS_CONFIG = {
  PENDING_REVIEW:  { label: 'status.pendingReview',       variant: 'warning',   Icon: Clock },
  CONFIRMED_FRAUD: { label: 'status.confirmedFraud',        variant: 'destructive', Icon: XCircle },
  RESOLVED:        { label: 'status.resolved',              variant: 'success',   Icon: CheckCircle2 },
  FALSE_POSITIVE:  { label: 'status.falsePositive',        variant: 'secondary', Icon: CircleDot },
  ESCALATED:       { label: 'status.escalated',              variant: 'warning',   Icon: ArrowUpCircle },
  NORMAL:          { label: 'status.normal',                variant: 'outline',   Icon: Check },
  rate_limited:    { label: 'status.apiLimit',              variant: 'outline',   Icon: PauseCircle },
}

function ScoreBadge({ score }) {
  const s = Number(score || 0)
  const variant = getScoreVariant(s)
  return <Badge variant={variant} className="font-mono text-xs">{(s * 100).toFixed(1)}%</Badge>
}

export function MobileAlertCard({ alert, onRefetch }) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const [resolving, setResolving] = useState(false)
  const navigate = useNavigate()

  const resolveAlert = async (type, label) => {
    if (resolving) return
    setResolving(true)
    try {
      const res = await fetch(`${API_BASE}/api/alerts/${alert.transaction_id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_type: type }),
      })
      if (res.status === 409) {
        toast.info(t('resolution.alreadyResolved'))
      } else if (res.ok) {
        toast.success(t('resolution.markedAs', { label }))
        if (onRefetch) onRefetch()
      } else {
        toast.error(`Error: HTTP ${res.status}`)
      }
    } catch {
      toast.error(t('feedback.networkError'))
    } finally {
      setResolving(false)
    }
  }

  const swipeHandlers = useSwipeable({
    onSwipedRight: () => {
      if (alert.status === 'PENDING_REVIEW') {
        toast(t('bulk.markFalsePositive'), {
          action: {
            label: t('actions.confirm'),
            onClick: () => resolveAlert('FALSE_POSITIVE', t('status.falsePositive')),
          },
        })
      }
    },
    onSwipedLeft: () => {
      if (alert.status === 'PENDING_REVIEW') {
        toast(t('bulk.markConfirmedFraud'), {
          action: {
            label: t('actions.confirm'),
            onClick: () => resolveAlert('CONFIRMED_FRAUD', t('status.confirmedFraud')),
          },
        })
      }
    },
    preventScrollOnSwipe: false,
    trackMouse: false,
    delta: 50,
  })

  const cfg = STATUS_CONFIG[alert.status] ?? STATUS_CONFIG.NORMAL
  const StatusIcon = cfg.Icon
  const timeStr = formatTimestamp(alert.timestamp)

  let explanation = null
  if (expanded && alert.ai_explanation) {
    try {
      explanation = typeof alert.ai_explanation === 'string'
        ? JSON.parse(alert.ai_explanation)
        : alert.ai_explanation
    } catch { /* ignore */ }
  }

  return (
    <div {...swipeHandlers}>
      <div
        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Top row: Score + Status */}
        <div className="flex items-center justify-between">
          <ScoreBadge score={alert.anomaly_score} />
          <Badge variant={cfg.variant} className="text-xs gap-1">
            <StatusIcon className="h-3 w-3" />{t(cfg.label)}
          </Badge>
        </div>

        {/* Middle: route + Amount */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="text-sm text-left text-blue-600 dark:text-blue-400 line-clamp-2 flex-1 min-w-0"
            onClick={(e) => {
              e.stopPropagation()
              if (alert.merchant_nif) navigate(`/merchants/${alert.merchant_nif}`)
            }}
          >
            {formatSourceDestination(alert)}
          </button>
          <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
            €{Number(alert.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Bottom: Category + Time */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="lowercase">{alert.category?.replace(/_/g, ' ')}</span>
          <span>{timeStr}</span>
        </div>
      </div>

      {/* Expanded XAI panel */}
      {expanded && (
        <ErrorBoundary>
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-lg px-3 py-3 space-y-2 -mt-1">
            {explanation && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-400">
                  <Cpu className="h-3.5 w-3.5" />
                  {t('alerts.aiAnalysis')}
                </div>
                {explanation.summary_pt && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">{explanation.summary_pt}</p>
                )}
                <ul className="space-y-1">
                  {(explanation.bullets || []).map((b) => (
                    <li key={b.id} className="flex gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <span>{b.icon}</span>
                      <span>{b.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {alert.sar_draft && (
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-red-600" />
                <Badge variant="destructive" className="text-xs">{t('alerts.sarAvailable')}</Badge>
              </div>
            )}
            {!explanation && !alert.sar_draft && (
              <p className="text-xs text-muted-foreground">{t('alerts.noAiAnalysis')}</p>
            )}
          </div>
        </ErrorBoundary>
      )}
    </div>
  )
}

export function MobileAlertCards({ data = [], isLoading, onRefetch }) {
  const { t } = useLanguage()

  if (isLoading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('alerts.loading')}
        </div>
      </div>
    )
  }

  if (!isLoading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 gap-2">
        <p className="text-sm text-muted-foreground">{t('alerts.noAlerts')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {data.map((alert) => (
        <MobileAlertCard key={alert.transaction_id} alert={alert} onRefetch={onRefetch} />
      ))}
    </div>
  )
}
