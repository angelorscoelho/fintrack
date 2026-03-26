import { useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KpiNavigationCard } from '@/components/dashboard/KpiNavigationCard'
import { VolumeChart } from '@/components/dashboard/VolumeChart'
import { CategoryChart } from '@/components/dashboard/CategoryChart'
import { LiveAlertFeed } from '@/components/dashboard/LiveAlertFeed'
import { GeoMap } from '@/components/dashboard/GeoMap'
import { Activity, ShieldAlert, Gauge, Loader2, AlertTriangle } from 'lucide-react'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { safeFetch } from '@/lib/api'
import { ErrorState } from '@/components/feedback/ErrorState'
import { KPI_THRESHOLDS } from '@/lib/constants'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function CommandCenter({ isIdle, setMutateAlerts, isDark }) {
  const queryClient = useQueryClient()

  const handlePullRefresh = useCallback(() => {
    return queryClient.invalidateQueries()
  }, [queryClient])

  const { isRefreshing, pullDistance } = usePullToRefresh(handlePullRefresh)

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await safeFetch(`${API_BASE}/api/stats`)
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
        queryClient.invalidateQueries({ queryKey: ['alerts-category'] })
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

  const fraudRateVariant = fraudRate > KPI_THRESHOLDS.critical_fraud_rate ? 'critical' : fraudRate > KPI_THRESHOLDS.warning_fraud_rate ? 'warning' : 'default'
  const avgScoreVariant = avgScore >= KPI_THRESHOLDS.critical_avg_score ? 'critical' : avgScore >= KPI_THRESHOLDS.warning_avg_score ? 'warning' : 'default'

  return (
    <>
      {/* Pull-to-refresh indicator (mobile) */}
      {(isRefreshing || pullDistance > 0) && (
        <div className="flex justify-center md:hidden">
          <Loader2
            className={`h-5 w-5 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ opacity: Math.min(pullDistance / 80, 1) }}
          />
        </div>
      )}

      {/* Error state */}
      {statsError && (
        <ErrorState onRetry={() => refetchStats()} />
      )}

      {/* Row 1: KPI Cards — horizontal scroll on mobile, 4-column grid on desktop */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 md:grid md:grid-cols-4 md:overflow-visible md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
        <KpiNavigationCard
          title="Transactions Today"
          value={total}
          icon={Activity}
          loading={statsLoading}
          tooltip="Total number of transactions processed in the last 24 hours"
          route="/transactions"
        />
        <KpiNavigationCard
          title="Fraud Rate"
          value={fraudRateDisplay}
          icon={AlertTriangle}
          variant={fraudRateVariant}
          loading={statsLoading}
          tooltip="Percentage of transactions flagged as potentially fraudulent"
          route="/alerts"
        />
        <KpiNavigationCard
          title="Critical Unreviewed"
          value={critical}
          icon={ShieldAlert}
          variant={critical > 0 ? 'critical' : 'default'}
          loading={statsLoading}
          tooltip="Critical alerts (score > 90%) still pending review"
          route="/alerts"
        />
        <KpiNavigationCard
          title="Average Score"
          value={avgScoreDisplay}
          icon={Gauge}
          variant={avgScoreVariant}
          loading={statsLoading}
          tooltip="Represents the rolling average of risk scores over the last 24 hours."
          route="/reports"
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

      {/* Row 3: Category breakdown chart */}
      <CategoryChart />

      {/* Row 4: Geographic alert distribution map */}
      <GeoMap />
    </>
  )
}
