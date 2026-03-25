import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, ArrowUpCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const ACTIONS = [
  { type: 'CONFIRMED_FRAUD', label: 'Confirm Fraud', icon: AlertTriangle, variant: 'destructive', msg: 'Fraud confirmed.' },
  { type: 'FALSE_POSITIVE', label: 'False Positive', icon: CheckCircle, variant: 'outline', cls: 'border-blue-500 text-blue-700 hover:bg-blue-50', msg: 'False positive registered.' },
  { type: 'ESCALATED', label: 'Escalate', icon: ArrowUpCircle, variant: 'secondary', msg: 'Alert escalated.' },
]

export function ResolutionPanel({ alert, onResolved }) {
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
      if (res.status === 409) throw new Error('This alert was already resolved.')
      if (!res.ok) throw new Error(`Server error: HTTP ${res.status}`)
      toast.success(action.msg, { duration: 4000 })
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
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Resolution</h3>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => {
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
              {action.label}
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
