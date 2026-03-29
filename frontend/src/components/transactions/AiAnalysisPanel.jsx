import { useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/i18n/LanguageContext'
import { AI_ANALYSIS_MIN_SCORE } from '@/lib/constants'
const API_BASE = import.meta.env.VITE_API_URL || ''

function parseExplanation(raw) {
  if (raw == null) return null
  let obj = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return null
  const summary = obj.summary_pt || obj.summary
  const bullets = obj.bullets
  if (!summary || !Array.isArray(bullets) || bullets.length < 3) return null
  return obj
}

/** Normalize backend risk label (PT/EN) for badge styling */
function normalizeAiRiskKey(riskLevel) {
  if (!riskLevel) return null
  const u = String(riskLevel).toUpperCase()
  if (u.includes('CRITICAL') || u.includes('CRÍTICO')) return 'CRITICAL'
  if (u.includes('HIGH') || u === 'ALTO') return 'HIGH'
  if (u.includes('MEDIUM') || u === 'MÉDIO') return 'MEDIUM'
  if (u.includes('LOW') || u === 'BAIXO') return 'LOW'
  return null
}

function RiskLevelBadge({ riskKey, t }) {
  if (!riskKey) return null
  if (riskKey === 'CRITICAL') {
    return (
      <Badge variant="destructive" className="font-bold">
        {t(`transactions.aiPanel.risk.${riskKey}`)}
      </Badge>
    )
  }
  if (riskKey === 'HIGH') {
    return (
      <Badge variant="destructive" className="font-normal">
        {t(`transactions.aiPanel.risk.${riskKey}`)}
      </Badge>
    )
  }
  if (riskKey === 'MEDIUM') {
    return (
      <Badge variant="warning" className="font-normal">
        {t(`transactions.aiPanel.risk.${riskKey}`)}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="font-normal">
      {t(`transactions.aiPanel.risk.${riskKey}`)}
    </Badge>
  )
}

export function AiAnalysisPanel({ transaction, onTransactionUpdate }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const score = Number(transaction?.anomaly_score ?? 0)
  const parsed = parseExplanation(transaction?.ai_explanation)
  const rawRisk = parsed?.risk_level
  const riskKey = normalizeAiRiskKey(rawRisk)

  const runAnalyze = useCallback(async () => {
    if (!transaction?.transaction_id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `${API_BASE}/api/alerts/${encodeURIComponent(transaction.transaction_id)}/analyze`,
        { method: 'POST' }
      )
      const text = await res.text()
      let body
      try {
        body = text ? JSON.parse(text) : null
      } catch {
        body = null
      }
      if (!res.ok) {
        let detailMsg = text || `HTTP ${res.status}`
        const d = body?.detail
        if (typeof d === 'string') detailMsg = d
        else if (Array.isArray(d)) {
          detailMsg = d.map((x) => x?.msg || JSON.stringify(x)).join('; ')
        } else if (d != null) detailMsg = JSON.stringify(d)
        throw new Error(detailMsg)
      }
      if (body && onTransactionUpdate) {
        onTransactionUpdate(body)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [transaction?.transaction_id, onTransactionUpdate])

  const showThresholdMsg = !parsed && score < AI_ANALYSIS_MIN_SCORE
  const showAnalyzeCta = !parsed && score >= AI_ANALYSIS_MIN_SCORE

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="shrink-0 border-b border-border px-1 pb-3">
        <h3 className="text-sm font-semibold tracking-tight">{t('transactions.aiPanel.title')}</h3>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-4">
        {parsed && (
          <div className="space-y-4">
            <p className="text-sm italic text-muted-foreground leading-relaxed">
              {parsed.summary_pt || parsed.summary}
            </p>

            {riskKey && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{t('transactions.aiPanel.riskLabel')}</span>
                <RiskLevelBadge riskKey={riskKey} t={t} />
              </div>
            )}

            <ul className="space-y-3 text-sm">
              {parsed.bullets.slice(0, 3).map((b, i) => (
                <li key={b.id ?? i} className="flex gap-2">
                  <span className="shrink-0 select-none" aria-hidden>
                    {b.icon || ['⚠️', '📊', '🔍'][i]}
                  </span>
                  <span className="text-foreground leading-snug">{b.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showThresholdMsg && (
          <p className="text-sm text-muted-foreground">
            {t('transactions.aiPanel.belowThreshold', {
              pct: Math.round(AI_ANALYSIS_MIN_SCORE * 100),
            })}
          </p>
        )}

        {showAnalyzeCta && (
          <div className="space-y-3">
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={loading}
              onClick={runAnalyze}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  {t('transactions.aiPanel.generating')}
                </>
              ) : error ? (
                t('transactions.aiPanel.retry')
              ) : (
                t('transactions.aiPanel.analyzeCta')
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
