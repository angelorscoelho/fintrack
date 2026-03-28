import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ResolutionPanel } from './ResolutionPanel'
import { SARExportButton } from './reports/SARExportButton'
import { AlertTriangle, Clock, Globe, Cpu, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { formatSourceDestination } from '@/lib/formatTransaction'

function ScoreRing({ score }) {
  const s = Number(score || 0)
  const pct = (s * 100).toFixed(1)
  const col = s > 0.90 ? 'text-red-600' : s >= 0.70 ? 'text-amber-500' : 'text-slate-500'
  const bg = s > 0.90 ? 'bg-red-50' : s >= 0.70 ? 'bg-amber-50' : 'bg-slate-50'
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl ${bg} p-4`}>
      <span className={`text-3xl font-bold ${col}`}>{pct}%</span>
      <span className="text-xs text-slate-500 mt-1">Anomaly Score</span>
    </div>
  )
}

function DataRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm font-medium text-slate-800 truncate">{value ?? '—'}</div>
      </div>
    </div>
  )
}

function XAIPanel({ explanation }) {
  if (!explanation) return null
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Cpu className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-amber-800">AI Analysis — Gemini Flash</h3>
      </div>
      <p className="text-xs text-amber-700 italic mb-3">{explanation.summary_pt}</p>
      <ul className="space-y-2">
        {(explanation.bullets || []).map((b) => (
          <li key={b.id} className="flex gap-2.5 text-sm text-slate-700">
            <span className="text-base leading-none mt-0.5">{b.icon}</span>
            <span>{b.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SARPanel({ markdown, transactionId, merchantNif, score }) {
  const [expanded, setExpanded] = useState(false)
  if (!markdown) return null
  return (
    <div className="rounded-lg border border-red-200 bg-red-50/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-red-600" />
          <h3 className="text-sm font-semibold text-red-800">SAR Draft — Gemini Pro</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-red-700 gap-1"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>
      {expanded && (
        <>
          <div className="prose prose-sm max-w-none text-slate-700">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
          <div className="mt-3 flex justify-end">
            <SARExportButton
              sarContent={markdown}
              transactionId={transactionId}
              merchantNif={merchantNif}
              score={score}
            />
          </div>
        </>
      )}
    </div>
  )
}

export function AlertDetail({ alert, open, onClose, onResolved }) {
  if (!alert) return null

  const score = Number(alert.anomaly_score || 0)
  const isRL = alert.status === 'rate_limited'

  let explanation = null
  if (alert.ai_explanation) {
    try {
      explanation = typeof alert.ai_explanation === 'string'
        ? JSON.parse(alert.ai_explanation)
        : alert.ai_explanation
    } catch { /* ignore parse errors */ }
  }

  const statusMap = {
    PENDING_REVIEW: { label: 'Pending Review', variant: 'warning' },
    RESOLVED: { label: 'Resolved', variant: 'success' },
    FALSE_POSITIVE: { label: 'False Positive', variant: 'secondary' },
    CONFIRMED_FRAUD: { label: 'Confirmed Fraud', variant: 'destructive' },
    ESCALATED: { label: 'Escalated', variant: 'default' },
    NORMAL: { label: 'Normal', variant: 'outline' },
    rate_limited: { label: 'API Limit', variant: 'outline' },
  }
  const st = statusMap[alert.status] || { label: alert.status, variant: 'outline' }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Alert Detail
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Score + Status */}
          <div className="flex items-start gap-4">
            <ScoreRing score={alert.anomaly_score} />
            <div className="space-y-1.5 pt-1">
              <Badge variant={st.variant}>{st.label}</Badge>
              <p className="text-xs text-slate-500 font-mono">{alert.transaction_id}</p>
            </div>
          </div>

          {/* Rate limited banner */}
          {isRL && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This alert was not analyzed by AI because the daily Gemini API limit has been reached.
              </AlertDescription>
            </Alert>
          )}

          {/* Data fields */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <DataRow icon={Clock} label="Date/Time" value={alert.timestamp} />
            <DataRow icon={Globe} label="Source → Destination" value={formatSourceDestination(alert)} />
            {alert.payment_platform && (
              <DataRow icon={FileText} label="Payment" value={String(alert.payment_platform).replace(/_/g, ' ')} />
            )}
            {(alert.source_country || alert.destination_country) && (
              <DataRow
                icon={Globe}
                label="Countries"
                value={`${alert.source_country ?? '—'} → ${alert.destination_country ?? '—'}`}
              />
            )}
            <DataRow icon={Globe} label="Merchant NIF (legacy)" value={alert.merchant_nif} />
            {alert.merchant_name && <DataRow icon={Globe} label="Merchant" value={alert.merchant_name} />}
            <DataRow icon={Globe} label="Merchant country" value={alert.merchant_country} />
            <DataRow icon={FileText} label="Amount" value={alert.amount != null ? `€${Number(alert.amount).toFixed(2)}` : null} />
            <DataRow icon={FileText} label="Category" value={alert.category} />
            <DataRow icon={Clock} label="IP Address" value={alert.ip_address} />
            <DataRow icon={FileText} label="Previous Average" value={alert.previous_avg_amount != null ? `€${Number(alert.previous_avg_amount).toFixed(2)}` : null} />
            <DataRow icon={Clock} label="Hour of Day" value={alert.hour_of_day} />
            <DataRow icon={Clock} label="Transactions (10min)" value={alert.transactions_last_10min} />
          </div>

          {/* XAI Panel — null-guarded */}
          <XAIPanel explanation={explanation} />

          {/* SAR Panel — null-guarded */}
          <SARPanel
            markdown={alert.sar_draft}
            transactionId={alert.transaction_id}
            merchantNif={alert.merchant_nif}
            score={alert.anomaly_score}
          />

          {/* Resolution Panel — only for PENDING_REVIEW */}
          {alert.status === 'PENDING_REVIEW' && (
            <ResolutionPanel alert={alert} onResolved={onResolved} />
          )}

          {/* Analyst notes */}
          {alert.analyst_notes && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-xs font-semibold text-slate-600 mb-1">Analyst Notes</h3>
              <p className="text-sm text-slate-700">{alert.analyst_notes}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
