import { useState, useMemo, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { safeFetch } from '@/lib/api'
import { EnhancedAlertsTable } from '@/components/alerts/EnhancedAlertsTable'
import { BulkActionBar } from '@/components/alerts/BulkActionBar'
import { FilterBar } from '@/components/alerts/FilterBar'
import { ScoreHistogram } from '@/components/alerts/ScoreHistogram'
import { MobileAlertCards } from '@/components/alerts/MobileAlertCard'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function AlertQueue({ isDark }) {
  const queryClient = useQueryClient()
  const clearSelectionRef = useRef(null)

  const handlePullRefresh = useCallback(() => {
    return queryClient.invalidateQueries()
  }, [queryClient])

  const { isRefreshing, pullDistance } = usePullToRefresh(handlePullRefresh)

  const [filters, setFilters] = useState({ status: '', scoreRange: '', category: '' })
  const [selectedRows, setSelectedRows] = useState([])

  const { data: rawAlerts = [], isLoading, isError } = useQuery({
    queryKey: ['alerts', filters.status],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      params.set('limit', '200')
      const res = await safeFetch(`${API_BASE}/api/alerts?${params.toString()}`)
      const json = await res.json()
      return Array.isArray(json) ? json : json.alerts || json.items || []
    },
    refetchInterval: 10000,
  })

  const filteredAlerts = useMemo(() => {
    let result = rawAlerts

    if (filters.scoreRange) {
      const [minStr, maxStr] = filters.scoreRange.split('-')
      const min = parseFloat(minStr)
      const max = parseFloat(maxStr)
      result = result.filter((a) => {
        const s = Number(a.anomaly_score || 0)
        return s >= min && s < max
      })
    }

    if (filters.category) {
      result = result.filter((a) => a.category === filters.category)
    }

    return result
  }, [rawAlerts, filters.scoreRange, filters.category])

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] })
  }, [queryClient])

  const handleHistogramClick = (range) => {
    setFilters((prev) => ({
      ...prev,
      scoreRange: prev.scoreRange === range ? '' : range,
    }))
  }

  const handleClearSelection = useCallback(() => {
    setSelectedRows([])
    if (clearSelectionRef.current) clearSelectionRef.current()
  }, [])

  return (
    <div className="space-y-4">
      {/* Pull-to-refresh indicator (mobile) */}
      {(isRefreshing || pullDistance > 0) && (
        <div className="flex justify-center md:hidden">
          <Loader2
            className={`h-5 w-5 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ opacity: Math.min(pullDistance / 80, 1) }}
          />
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <div>
            <h1 className="text-lg font-bold text-slate-800">Fila de Alertas</h1>
            <p className="text-xs text-slate-500">{filteredAlerts.length} alertas</p>
          </div>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Erro ao carregar dados. Tente novamente.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-3 shrink-0">
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <FilterBar filters={filters} onFilterChange={setFilters} />

      {/* Score histogram + Bulk actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <ScoreHistogram alerts={rawAlerts} onBucketClick={handleHistogramClick} isDark={isDark} />
        </div>
        <div className="md:col-span-2 flex items-end">
          {selectedRows.length > 0 && (
            <BulkActionBar
              selectedRows={selectedRows}
              onClearSelection={handleClearSelection}
              onComplete={refetch}
            />
          )}
        </div>
      </div>

      {/* Enhanced table (desktop) / Cards (mobile) */}
      <div className="hidden md:block">
        <EnhancedAlertsTable
          data={filteredAlerts}
          isLoading={isLoading}
          onRefetch={refetch}
          onSelectionChange={setSelectedRows}
          clearSelectionRef={clearSelectionRef}
        />
      </div>
      <div className="md:hidden">
        <MobileAlertCards
          data={filteredAlerts}
          isLoading={isLoading}
          onRefetch={refetch}
        />
      </div>
    </div>
  )
}
