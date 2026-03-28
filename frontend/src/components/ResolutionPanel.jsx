import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, ArrowUpCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/i18n/LanguageContext'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const ACTION_DEFS = [
  { type: 'CONFIRMED_FRAUD', labelKey: 'actions.confirmFraud', icon: AlertTriangle, variant: 'destructive', msgKey: 'resolution.fraudConfirmed' },
  { type: 'FALSE_POSITIVE', labelKey: 'actions.falsePositive', icon: CheckCircle, variant: 'outline', cls: 'border-blue-500 text-blue-700 hover:bg-blue-50', msgKey: 'resolution.falsePositiveRegistered' },
  { type: 'ESCALATED', labelKey: 'actions.escalate', icon: ArrowUpCircle, variant: 'secondary', msgKey: 'resolution.alertEscalated' },
]

export function ResolutionPanel({ alert, onResolved }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handle = async (action) => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/alerts/${alert.transaction_id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_type: action.type }),
      })
      if (res.status === 409) throw new Error(t('resolution.alreadyResolved'))
      if (!res.ok) throw new Error(`Server error: HTTP ${res.status}`)
      toast.success(t(action.msgKey), { duration: 4000 })
      onResolved()
    } catch (e) {
      setError(e.message)
      toast.error(e.message, { duration: 5000 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('resolution.title')}</h3>
      <div className="flex flex-wrap gap-2">
        {ACTION_DEFS.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.type}
              variant={action.variant}
              className={cn('gap-2', action.cls)}
              disabled={loading}
              onClick={() => handle(action)}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
              {t(action.labelKey)}
            </Button>
          )
        })}
      </div>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
