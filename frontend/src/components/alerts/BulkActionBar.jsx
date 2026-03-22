import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, XCircle, CheckCircle, ArrowUpCircle } from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = import.meta.env.VITE_API_URL || ''

export function BulkActionBar({ selectedRows, onClearSelection, onComplete }) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const count = selectedRows.length
  if (count === 0) return null

  const handleBulk = async (resolutionType, label) => {
    setLoading(true)
    setProgress({ current: 0, total: count })
    let successCount = 0
    let alreadyResolved = 0

    for (let i = 0; i < selectedRows.length; i++) {
      setProgress({ current: i + 1, total: count })
      try {
        const res = await fetch(
          `${API_BASE}/api/alerts/${selectedRows[i].transaction_id}/resolve`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resolution_type: resolutionType }),
          }
        )
        if (res.status === 409) {
          alreadyResolved++
        } else if (res.ok) {
          successCount++
        }
      } catch {
        // continue with next
      }
    }

    setLoading(false)
    setProgress({ current: 0, total: 0 })

    if (successCount > 0) {
      toast.success(`${successCount} alerta(s) marcado(s) como ${label}.`)
    }
    if (alreadyResolved > 0) {
      toast.info(`${alreadyResolved} alerta(s) já resolvido(s).`)
    }

    onClearSelection()
    onComplete()
  }

  return (
    <div className="transform transition-all duration-300 ease-out translate-y-0 bg-slate-800 text-white rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium">
        {loading
          ? `Processando ${progress.current} de ${progress.total}...`
          : `${count} alerta${count > 1 ? 's' : ''} seleccionado${count > 1 ? 's' : ''}`}
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <Button
          size="sm"
          variant="secondary"
          className="h-8 text-xs gap-1.5"
          disabled={loading}
          onClick={() => handleBulk('FALSE_POSITIVE', 'Falso Positivo')}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
          Marcar como Falso Positivo
        </Button>

        <Button
          size="sm"
          variant="secondary"
          className="h-8 text-xs gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
          disabled={loading}
          onClick={() => handleBulk('ESCALATED', 'Escalado')}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpCircle className="h-3 w-3" />}
          Escalar todos
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-slate-300 hover:text-white hover:bg-slate-700"
          disabled={loading}
          onClick={onClearSelection}
        >
          <XCircle className="h-3 w-3 mr-1" />
          Limpar selecção
        </Button>
      </div>
    </div>
  )
}
