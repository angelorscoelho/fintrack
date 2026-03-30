import { useEffect, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { KpiNavigationCard } from '@/components/dashboard/KpiNavigationCard'
import { VolumeChart } from '@/components/dashboard/VolumeChart'
import { CategoryChart } from '@/components/dashboard/CategoryChart'
import { LiveAlertFeed } from '@/components/dashboard/LiveAlertFeed'
import { GeoMap } from '@/components/dashboard/GeoMap'
import { Activity, ShieldAlert, Gauge, Loader2, AlertTriangle } from 'lucide-react'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useTransactionData } from '@/hooks/useTransactionData'
import { ErrorState } from '@/components/feedback/ErrorState'
import { KPI_THRESHOLDS } from '@/lib/constants'
import { useLanguage } from '@/i18n/LanguageContext'

export default function CommandCenter({ setMutateAlerts }) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const handlePullRefresh = useCallback(() => {
    return queryClient.invalidateQueries()
  }, [queryClient])

  const { isRefreshing, pullDistance } = usePullToRefresh(handlePullRefresh)

  const { data, isLoading: statsLoading, error, refetch: refetchStats } = useTransactionData()
  const stats = data?.stats || {}
  const statsError = Boolean(error)

  // Expose a mutate-like function so SSE stream can trigger refetch
  useEffect(() => {
    if (setMutateAlerts) {
      setMutateAlerts(() => () => {
        queryClient.invalidateQueries({ queryKey: ['transaction-data'] })
      })
    }
  }, [setMutateAlerts, queryClient])

  // Derived KPI values
  const total = stats?.total ?? 0
  const last24h = stats?.last_24h ?? 0
  const pending = stats?.pending ?? 0
  const apiFraudRate = stats?.fraud_rate
  const critical = total > 0 && apiFraudRate !== undefined && apiFraudRate !== null
    ? Math.ceil(Number(apiFraudRate) * total)
    : (stats?.critical ?? 0)
  const avgScore = stats?.avg_score ?? 0
  const confirmedFraud = stats?.confirmed_fraud

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
          if (r < 0.1) return r.toFixed(3) + '%'
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

      {/* Row 1: KPI Cards — horizontal scroll on mobile, 5-column grid on desktop */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0 md:pb-0">
        <KpiNavigationCard
          title={t('kpi.transactions24h')}
          value={last24h}
          icon={Activity}
          loading={statsLoading}
          tooltip={t('kpi.transactions24hTooltip')}
          actionTooltip={t('kpi.transactions24hAction')}
          subLabel={last24hSubLabel}
          route="/transactions?period=24h"
          aiContext={{ card: 'transactions_24h', value: last24h, period: 'last 24h' }}
          aiLabel="Transactions (24h)"
        />
        <KpiNavigationCard
          title={t('kpi.fraudRate')}
          value={fraudRateDisplay}
          icon={AlertTriangle}
          variant={fraudRateVariant}
          loading={statsLoading}
          tooltip={t('kpi.fraudRateTooltip')}
          actionTooltip={t('kpi.fraudRateAction')}
          route="/transactions?status=CONFIRMED_FRAUD"
          aiContext={{ card: 'fraud_rate', value: fraudRateDisplay, period: 'last 24h' }}
          aiLabel="Fraud Rate"
        />
        <KpiNavigationCard
          title={t('kpi.criticalUnreviewed')}
          value={critical}
          icon={ShieldAlert}
          variant={critical > 0 ? 'critical' : 'default'}
          loading={statsLoading}
          tooltip={t('kpi.criticalUnreviewedTooltip')}
          actionTooltip={t('kpi.criticalUnreviewedAction')}
          route="/transactions?status=PENDING_REVIEW&minScore=90"
          aiContext={{
            card: 'critical_alerts',
            count: critical,
            filter: 'score>90 & PENDING_REVIEW',
          }}
          aiLabel="Critical Unreviewed"
        />
        <KpiNavigationCard
          title={t('kpi.avgScore')}
          value={avgScoreDisplay}
          icon={Gauge}
          variant={avgScoreVariant}
          loading={statsLoading}
          tooltip={t('kpi.avgScoreTooltip')}
          actionTooltip={t('kpi.avgScoreAction')}
          route="/alerts"
          aiContext={{ card: 'avg_score', value: avgScore }}
          aiLabel="Average Anomaly Score"
        />
        <CategoryChart />
      </div>

      {/* Hourly volume + High Risk feed */}
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-h-0 min-w-0">
          <VolumeChart />
        </div>
        <div className="min-h-0 min-w-0">
          <LiveAlertFeed />
        </div>
      </div>

      {/* Card 12: Geographic alert distribution map */}
      <GeoMap />
    </>
  )
}
