import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { AlertsTable } from '@/components/AlertsTable'
import { AlertDetail } from '@/components/AlertDetail'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const fetcher  = (url) => fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json() })

export default function CommandCenter({ isIdle, mutateAlerts, setMutateAlerts }) {
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [detailOpen,    setDetailOpen]    = useState(false)

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

  // Expose mutate to parent so SSE stream can trigger refetch
  if (setMutateAlerts) setMutateAlerts(() => mutate)

  const handleRowClick = (alert) => { setSelectedAlert(alert); setDetailOpen(true) }
  const handleResolved = () => { mutate(); setDetailOpen(false) }

  return (
    <>
      {/* Stats cards row */}
      <StatsBar stats={stats} />

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
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

      {/* Alerts table */}
      <AlertsTable
        data={data?.items ?? []}
        isLoading={isLoading}
        onRowClick={handleRowClick}
      />

      {/* Detail sheet */}
      <AlertDetail
        alert={selectedAlert}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onResolved={handleResolved}
      />
    </>
  )
}

function StatsBar({ stats }) {
  if (!stats) return null
  const cards = [
    { label: 'Total',            value: stats.total,           color: 'secondary' },
    { label: 'Pendentes',        value: stats.pending,         color: 'warning' },
    { label: 'Críticos',         value: stats.critical,        color: 'destructive' },
    { label: 'Falsos Positivos', value: stats.false_positives, color: 'secondary' },
    { label: 'Limite API',       value: stats.rate_limited,    color: 'outline' },
  ]
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {cards.map(({ label, value, color }) => (
        <Badge key={label} variant={color} className="text-xs">
          {label}: {value ?? '–'}
        </Badge>
      ))}
    </div>
  )
}
