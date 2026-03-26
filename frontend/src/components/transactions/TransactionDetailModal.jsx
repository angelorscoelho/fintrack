import { useState } from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { useLanguage } from '@/i18n/LanguageContext'
import { classifyRisk, getScoreRingColors } from '@/lib/constants'
import { Copy, Check } from 'lucide-react'

const categoryColors = {
  retail: 'secondary',
  online: 'default',
  restaurant: 'warning',
  gas_station: 'outline',
  supermarket: 'success',
  electronics: 'default',
  travel: 'destructive',
  pharmacy: 'secondary',
}

/* ── Section header ────────────────────────────────────────────────────────── */
function SectionHeader({ title }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-3 first:pt-0">
      {title}
    </h3>
  )
}

/* ── Anomaly Score progress bar (green / orange / red) ─────────────────────── */
const SCORE_BAR_COLORS = {
  CRITICAL: 'bg-red-500 dark:bg-red-400',
  HIGH:     'bg-amber-500 dark:bg-amber-400',
  MEDIUM:   'bg-green-500 dark:bg-green-400',
  LOW:      'bg-green-500 dark:bg-green-400',
}

function AnomalyScoreBar({ score }) {
  const s = Number(score || 0)
  const pct = s * 100
  const risk = classifyRisk(s)
  const { text: textColor } = getScoreRingColors(s)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold font-mono ${textColor}`}>
          {pct.toFixed(1)}%
        </span>
        <Badge
          variant={
            risk === 'CRITICAL'
              ? 'destructive'
              : risk === 'HIGH'
                ? 'warning'
                : 'outline'
          }
          className="text-[10px]"
        >
          {risk}
        </Badge>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${SCORE_BAR_COLORS[risk]}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

/* ── Copy-to-clipboard button ──────────────────────────────────────────────── */
function CopyIdButton({ text, t }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard API unavailable — silently ignore */
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleCopy}
          >
            {copied
              ? <Check className="h-3.5 w-3.5 text-green-500" />
              : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? t('transactions.copiedId') : t('transactions.copyId')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/* ── Main modal ────────────────────────────────────────────────────────────── */
export function TransactionDetailModal({ transaction, open, onOpenChange }) {
  const { t } = useLanguage()

  if (!transaction) return null

  const formattedDate = transaction.timestamp
    ? format(new Date(transaction.timestamp), 'PPpp')
    : '—'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('transactions.details')}</DialogTitle>
          <DialogDescription className="sr-only">
            {transaction.transaction_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Identificação ──────────────────────────────────────────── */}
          <SectionHeader title={t('transactions.sections.identification')} />

          {/* Transaction ID + copy */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">{t('columns.id')}</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-mono truncate">
                {transaction.transaction_id}
              </span>
              <CopyIdButton text={transaction.transaction_id} t={t} />
            </div>
          </div>

          {/* Date */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t('columns.date')}</span>
            <span className="text-sm">{formattedDate}</span>
          </div>

          {/* ── Dados Financeiros ──────────────────────────────────────── */}
          <SectionHeader title={t('transactions.sections.financialData')} />

          {/* Amount — large highlight */}
          <div className="rounded-lg bg-muted/60 p-4 text-center">
            <span className="text-2xl font-bold tracking-tight">
              €{Number(transaction.amount).toFixed(2)}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('columns.amount')}</p>
          </div>

          {/* Category */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t('columns.category')}</span>
            <Badge variant={categoryColors[transaction.category] || 'outline'}>
              {transaction.category}
            </Badge>
          </div>

          {/* Status */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t('columns.status')}</span>
            <Badge
              variant={
                transaction.status === 'NORMAL'
                  ? 'success'
                  : transaction.status === 'PENDING_REVIEW'
                    ? 'warning'
                    : 'secondary'
              }
            >
              {transaction.status}
            </Badge>
          </div>

          {/* ── Análise de Risco ───────────────────────────────────────── */}
          <SectionHeader title={t('transactions.sections.riskAnalysis')} />

          {/* Anomaly Score — progress bar */}
          <div>
            <span className="text-sm text-muted-foreground block mb-2">
              {t('alerts.anomalyScore')}
            </span>
            <AnomalyScoreBar score={transaction.anomaly_score} />
          </div>

          {/* ── Contexto ───────────────────────────────────────────────── */}
          <SectionHeader title={t('transactions.sections.context')} />

          {/* Merchant */}
          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">{t('columns.merchant')}</span>
            <span className="text-sm font-medium text-right">
              {transaction.merchant_name || transaction.merchant_nif}
            </span>
          </div>

          {/* Origin Country */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t('transactions.originCountry')}</span>
            <span className="text-sm">{transaction.cardholder_country ?? '—'}</span>
          </div>

          {/* Destination Country */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t('transactions.destinationCountry')}</span>
            <span className="text-sm">{transaction.merchant_country ?? '—'}</span>
          </div>

          {/* Notes (analyst_notes) */}
          {transaction.analyst_notes && (
            <div className="border-t pt-3">
              <span className="text-sm text-muted-foreground block mb-1">{t('transactions.notes')}</span>
              <p className="text-sm bg-muted rounded-md p-3">
                {transaction.analyst_notes}
              </p>
            </div>
          )}

          {/* AI Explanation */}
          {transaction.ai_explanation && (
            <ErrorBoundary>
              <div className="border-t pt-3">
                <span className="text-sm text-muted-foreground block mb-1">{t('alerts.aiAnalysis')}</span>
                <p className="text-sm bg-muted rounded-md p-3">
                  {(() => {
                    const explanation = transaction.ai_explanation
                    if (typeof explanation === 'string') {
                      try {
                        const parsed = JSON.parse(explanation)
                        return parsed.summary_pt || explanation
                      } catch {
                        return explanation
                      }
                    }
                    return explanation.summary_pt || JSON.stringify(explanation)
                  })()}
                </p>
              </div>
            </ErrorBoundary>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
