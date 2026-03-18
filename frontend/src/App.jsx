import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { Toaster } from 'sonner'
import { AlertsTable } from './components/AlertsTable'
import { AlertDetail } from './components/AlertDetail'
import { InactivityOverlay } from './components/InactivityOverlay'
import { useAlertStream } from './hooks/useAlertStream'
import { useInactivityTimer } from './hooks/useInactivityTimer'
import { ShieldAlert, Wifi, WifiOff, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const fetcher  = (url) => fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json() })

export default function App() {
  const [statusFilter,   setStatusFilter]   = useState('all')
  const [selectedAlert,  setSelectedAlert]  = useState(null)
  const [detailOpen,     setDetailOpen]     = useState(false)
  const [isConnected,    setIsConnected]    = useState(true)

  // Inactivity timer — pauses SSE after 30min idle
  const { isIdle, resetTimer } = useInactivityTimer(
    parseInt(import.meta.env.VITE_INACTIVITY_TIMEOUT_MS || '1800000')
  )

  const apiStatus = statusFilter === 'all' ? '' : statusFilter

  const { data, error, isLoading, mutate } = useSWR(
    `${API_BASE}/api/alerts?status=${apiStatus}&limit=50`,
    fetcher,
    { refreshInterval: isIdle ? 0 : 8000, revalidateOnFocus: !isIdle }
  )
  const { data: stats } = useSWR(
    `${API_BASE}/api/stats`,
    fetcher,
    { refreshInterval: isIdle ? 0 : 15000 }
  )

  const handleNewAlert = useCallback(() => mutate(), [mutate])
  useAlertStream(handleNewAlert, isIdle, setIsConnected)

  const handleRowClick = (alert) => { setSelectedAlert(alert); setDetailOpen(true) }
  const handleResolved = () => { mutate(); setDetailOpen(false) }
  const handleResume   = () => { resetTimer(); mutate() }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">FinTrack AI</h1>
              <p className="text-xs text-slate-500">Fraud Detection & Fiscal Anomaly Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatsBar stats={stats} />
            <div className="flex items-center gap-1 text-xs text-slate-500">
              {isConnected
                ? <Wifi className="h-3.5 w-3.5 text-green-500" />
                : <WifiOff className="h-3.5 w-3.5 text-red-400" />}
              <span>{isConnected ? 'Ligado' : 'Desligado'}</span>
            </div>
            {isIdle && (
              <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                <Clock className="h-3 w-3" />
                <span>Inativo</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="p-6 max-w-screen-xl mx-auto space-y-4">
        {/* Filter bar */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Estado:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-52 h-8 text-sm">
              <SelectValue placeholder="Todos os alertas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="PENDING_REVIEW">⏳ Pendente Revisão</SelectItem>
              <SelectItem value="RESOLVED">✅ Resolvido</SelectItem>
              <SelectItem value="FALSE_POSITIVE">🔵 Falso Positivo</SelectItem>
              <SelectItem value="rate_limited">⏸ Limite API</SelectItem>
              <SelectItem value="NORMAL">✓ Normal</SelectItem>
            </SelectContent>
          </Select>
          {isLoading && (
            <span className="text-xs text-slate-400 animate-pulse">A atualizar…</span>
          )}
          {error && (
            <span className="text-xs text-red-500">Erro ao carregar dados do servidor</span>
          )}
        </div>

        <AlertsTable
          data={data?.items ?? []}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />
      </main>

      <AlertDetail
        alert={selectedAlert}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onResolved={handleResolved}
      />

      {/* Inactivity overlay — blocks interaction until user resumes */}
      <InactivityOverlay isVisible={isIdle} onResume={handleResume} />
    </div>
  )
}

function StatsBar({ stats }) {
  if (!stats) return null
  const cards = [
    { label: 'Total',          value: stats.total,          color: 'secondary' },
    { label: 'Pendentes',      value: stats.pending,        color: 'warning' },
    { label: 'Críticos',       value: stats.critical,       color: 'destructive' },
    { label: 'Falsos Positivos', value: stats.false_positives, color: 'secondary' },
    { label: 'Limite API',     value: stats.rate_limited,   color: 'outline' },
  ]
  return (
    <div className="flex items-center gap-2">
      {cards.map(({ label, value, color }) => (
        <Badge key={label} variant={color} className="text-xs">
          {label}: {value ?? '–'}
        </Badge>
      ))}
    </div>
  )
}
