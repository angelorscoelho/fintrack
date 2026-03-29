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
import { formatSourceDestination } from '@/lib/formatTransaction'
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
import { useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'
import { AiAnalysisPanel } from '@/components/transactions/AiAnalysisPanel'

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
    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-3 first:pt-0">
      {title}
    </h4>
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
            aria-label={t('transactions.copyId')}
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
export function TransactionDetailModal({ transaction, open, onOpenChange, onTransactionUpdate }) {
  const { t } = useLanguage()
  const { isOpen: isSidebarOpen } = useSidebar()
  const [aiPanelKey, setAiPanelKey] = useState(0)

  if (!transaction) return null

  const formattedDate = transaction.timestamp
    ? format(new Date(transaction.timestamp), 'PPpp')
    : '—'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:rounded-lg',
          isSidebarOpen
            ? '!max-w-[calc(100vw-var(--sidebar-width)-2rem)]'
            : '!max-w-[min(80vw,1200px)]'
        )}
      >
        <DialogHeader className="shrink-0 space-y-1.5 px-6 pt-6 text-left">
          <DialogTitle>{t('transactions.details')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('transactions.details')} — {transaction.transaction_id}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            'grid min-h-0 flex-1 grid-cols-1 gap-0 border-t border-border',
            'min-[901px]:grid-cols-[40%_60%]'
          )}
        >
          {/* Left column — structured transaction data (unchanged) */}
          <div className="min-h-0 min-[901px]:max-h-[calc(85vh-7rem)] overflow-y-auto px-6 pb-6 min-[901px]:border-r min-[901px]:border-border">
            <div className="space-y-4">
              <SectionHeader title={t('transactions.sections.identification')} />

              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">{t('columns.id')}</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-mono truncate">
                    {transaction.transaction_id}
                  </span>
                  <CopyIdButton text={transaction.transaction_id} t={t} />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('columns.date')}</span>
                <span className="text-sm">{formattedDate}</span>
              </div>

              <SectionHeader title={t('transactions.sections.financialData')} />

              <div className="rounded-lg bg-muted/60 p-4 text-center">
                <span className="text-2xl font-bold tracking-tight">
                  €{Number(transaction.amount).toFixed(2)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">{t('columns.amount')}</p>
              </div>

              <div className="flex justify-between items-start gap-4">
                <span className="text-sm text-muted-foreground shrink-0">{t('columns.sourceDestination')}</span>
                <span className="text-sm font-medium text-right break-words max-w-[70%]">
                  {formatSourceDestination(transaction)}
                </span>
              </div>

              {transaction.payment_platform && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('alertDetail.payment')}</span>
                  <span className="text-sm capitalize">{transaction.payment_platform.replace(/_/g, ' ')}</span>
                </div>
              )}

              {(transaction.source_country || transaction.destination_country) && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('alertDetail.routeCountries')}</span>
                  <span className="text-sm font-mono">
                    {(transaction.source_country || '—') + ' → ' + (transaction.destination_country || '—')}
                  </span>
                </div>
              )}

              {(transaction.merchant_name || transaction.merchant_nif) && (
                <div className="flex justify-between items-start gap-4">
                  <span className="text-sm text-muted-foreground shrink-0">{t('alertDetail.merchantNif')}</span>
                  <span className="text-sm text-right break-words max-w-[70%]">
                    {transaction.merchant_name || transaction.merchant_nif}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('columns.category')}</span>
                <Badge variant={categoryColors[transaction.category] || 'outline'}>
                  {transaction.category}
                </Badge>
              </div>

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

              <SectionHeader title={t('transactions.sections.riskAnalysis')} />

              <div>
                <span className="text-sm text-muted-foreground block mb-2">
                  {t('alerts.anomalyScore')}
                </span>
                <AnomalyScoreBar score={transaction.anomaly_score} />
              </div>

              <SectionHeader title={t('transactions.sections.context')} />

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('transactions.originCountry')}</span>
                <span className="text-sm">{transaction.source_country ?? transaction.cardholder_country ?? '—'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('transactions.destinationCountry')}</span>
                <span className="text-sm">{transaction.destination_country ?? transaction.merchant_country ?? '—'}</span>
              </div>

              {transaction.analyst_notes && (
                <div className="border-t pt-3">
                  <span className="text-sm text-muted-foreground block mb-1">{t('transactions.notes')}</span>
                  <p className="text-sm bg-muted rounded-md p-3">
                    {transaction.analyst_notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right column — AI analysis */}
          <div className="flex min-h-0 min-[901px]:max-h-[calc(85vh-7rem)] flex-col overflow-y-auto border-t border-border bg-card p-4 min-[901px]:border-t-0">
            <ErrorBoundary
              key={aiPanelKey}
              fallback={(
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">{t('transactions.aiPanel.boundaryError')}</p>
                  <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setAiPanelKey((k) => k + 1)}>
                    {t('transactions.aiPanel.retry')}
                  </Button>
                </div>
              )}
            >
              <AiAnalysisPanel transaction={transaction} onTransactionUpdate={onTransactionUpdate} />
            </ErrorBoundary>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
