import { useEffect, useCallback, useMemo } from 'react'
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
import { useLanguage } from '@/i18n/LanguageContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function CommandCenter({ isIdle, setMutateAlerts, isDark }) {
  const { t } = useLanguage()
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
  const last24h = stats?.last_24h ?? 0
  const pending = stats?.pending ?? 0
  const critical = stats?.critical ?? 0
  const avgScore = stats?.avg_score ?? 0
  const confirmedFraud = stats?.confirmed_fraud
  const apiFraudRate = stats?.fraud_rate

  const fraudRatePercent =
    total > 0
      ? (confirmedFraud !== undefined
          ? (confirmedFraud / total) * 100
          : apiFraudRate !== undefined && apiFraudRate !== null
            ? Number(apiFraudRate) * 100
            : (pending / total) * 100)
      : 0
  const fraudRateDisplay =
    total > 0
      ? (() => {
          const r = fraudRatePercent
          if (r === 0) return '0.00%'
          if (r < 1) return r.toFixed(2) + '%'
          return r.toFixed(1) + '%'
        })()
      : '–'
  const avgScoreDisplay = (avgScore * 100).toFixed(1) + '%'

  const fraudRateVariant = fraudRatePercent > KPI_THRESHOLDS.critical_fraud_rate ? 'critical' : fraudRatePercent > KPI_THRESHOLDS.warning_fraud_rate ? 'warning' : 'default'
  const avgScoreVariant = avgScore >= KPI_THRESHOLDS.critical_avg_score ? 'critical' : avgScore >= KPI_THRESHOLDS.warning_avg_score ? 'warning' : 'default'

  // Sub-label: "Since HH:MM of dd/MM/yyyy"
  const last24hSubLabel = useMemo(() => {
    const since = new Date(Date.now() - 86400 * 1000)
    const hh = String(since.getHours()).padStart(2, '0')
    const mm = String(since.getMinutes()).padStart(2, '0')
    const dd = String(since.getDate()).padStart(2, '0')
    const mo = String(since.getMonth() + 1).padStart(2, '0')
    const yyyy = since.getFullYear()
    return t('kpi.since', { time: `${hh}:${mm}`, date: `${dd}/${mo}/${yyyy}` })
  }, [stats, t])

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
          title={t('kpi.transactions24h')}
          value={last24h}
          icon={Activity}
          loading={statsLoading}
          tooltip={t('kpi.transactions24hTooltip')}
          actionTooltip={t('kpi.transactions24hAction')}
          subLabel={last24hSubLabel}
          route="/transactions"
        />
        <KpiNavigationCard
          title={t('kpi.fraudRate')}
          value={fraudRateDisplay}
          icon={AlertTriangle}
          variant={fraudRateVariant}
          loading={statsLoading}
          tooltip={t('kpi.fraudRateTooltip')}
          actionTooltip={t('kpi.fraudRateAction')}
          route="/alerts?status=CONFIRMED_FRAUD"
        />
        <KpiNavigationCard
          title={t('kpi.criticalUnreviewed')}
          value={critical}
          icon={ShieldAlert}
          variant={critical > 0 ? 'critical' : 'default'}
          loading={statsLoading}
          tooltip={t('kpi.criticalUnreviewedTooltip')}
          actionTooltip={t('kpi.criticalUnreviewedAction')}
          route="/alerts?scoreRange=0.90-1.00&status=PENDING_REVIEW"
        />
        <KpiNavigationCard
          title={t('kpi.avgScore')}
          value={avgScoreDisplay}
          icon={Gauge}
          variant={avgScoreVariant}
          loading={statsLoading}
          tooltip={t('kpi.avgScoreTooltip')}
          actionTooltip={t('kpi.avgScoreAction')}
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
