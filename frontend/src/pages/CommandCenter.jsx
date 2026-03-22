import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KPICard } from '@/components/dashboard/KPICard'
import { VolumeChart } from '@/components/dashboard/VolumeChart'
import { LiveAlertFeed } from '@/components/dashboard/LiveAlertFeed'
import { GeoMap } from '@/components/dashboard/GeoMap'
import { Activity, AlertTriangle, ShieldAlert, Gauge } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function CommandCenter({ isIdle, setMutateAlerts, isDark }) {
  const queryClient = useQueryClient()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/stats`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: isIdle ? false : 15000,
  })

  // Expose a mutate-like function so SSE stream can trigger refetch
  useEffect(() => {
    if (setMutateAlerts) {
      setMutateAlerts(() => () => {
        queryClient.invalidateQueries({ queryKey: ['stats'] })
        queryClient.invalidateQueries({ queryKey: ['feed-alerts'] })
        queryClient.invalidateQueries({ queryKey: ['alerts-volume'] })
        queryClient.invalidateQueries({ queryKey: ['geo-alerts'] })
      })
    }
  }, [setMutateAlerts, queryClient])

  // Derived KPI values
  const total = stats?.total ?? 0
  const pending = stats?.pending ?? 0
  const critical = stats?.critical ?? 0
  const avgScore = stats?.avg_score ?? 0

  const fraudRate = total > 0 ? (pending / total) * 100 : 0
  const fraudRateDisplay = total > 0 ? fraudRate.toFixed(1) + '%' : '–'
  const avgScoreDisplay = (avgScore * 100).toFixed(1) + '%'

  const fraudRateVariant = fraudRate > 10 ? 'critical' : fraudRate > 5 ? 'warning' : 'default'
  const avgScoreVariant = avgScore >= 0.70 ? 'critical' : avgScore >= 0.50 ? 'warning' : 'default'

  return (
    <>
      {/* Row 1: KPI Cards — horizontal scroll on mobile, 4-column grid on desktop */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 md:grid md:grid-cols-4 md:overflow-visible md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
        <KPICard
          title="Transações Hoje"
          value={total}
          icon={Activity}
          loading={statsLoading}
        />
        <KPICard
          title="Taxa de Fraude"
          value={fraudRateDisplay}
          icon={AlertTriangle}
          variant={fraudRateVariant}
          loading={statsLoading}
        />
        <KPICard
          title="Alertas Críticos"
          value={critical}
          icon={ShieldAlert}
          variant={critical > 0 ? 'critical' : 'default'}
          loading={statsLoading}
        />
        <KPICard
          title="Score Médio"
          value={avgScoreDisplay}
          icon={Gauge}
          variant={avgScoreVariant}
          loading={statsLoading}
        />
      </div>

      {/* Row 2: Chart + Live Feed — stacked on mobile, 60/40 on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3">
          <VolumeChart isDark={isDark} />
        </div>
        <div className="md:col-span-2">
          <LiveAlertFeed />
        </div>
      </div>

      {/* Row 3: Geographic alert distribution map */}
      <GeoMap />
    </>
  )
}
