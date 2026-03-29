import { useMemo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/i18n/LanguageContext'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, AlertTriangle } from 'lucide-react'
import { startOfHour, subHours, format, parseISO } from 'date-fns'
import { safeFetch } from '@/lib/api'
import { XAI_THRESHOLD, SAR_THRESHOLD, API_MAX_LIMIT } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { CardAIButton } from '@/components/ai-sidebar/CardAIButton'

const API_BASE = import.meta.env.VITE_API_URL || ''

const MS_24H = 86400000

/** Hex fills (Recharts); Normal ≈ slate-400, Suspicious ≈ orange-500, Critical ≈ red-500 */
const FILL = {
  normal: '#94a3b8',
  suspicious: '#f97316',
  critical: '#ef4444',
}

function classifyTier(score) {
  const s = Number(score || 0)
  if (s >= SAR_THRESHOLD) return 'critical'
  if (s >= XAI_THRESHOLD) return 'suspicious'
  return 'normal'
}

/**
 * Rolling last 24h (now − 86400s … now), 24 clock-hour buckets, oldest → newest.
 */
function bucketVolumeByHour(items) {
  const now = new Date()
  const cutoffMs = now.getTime() - MS_24H
  const currentHourStart = startOfHour(now)

  const map = new Map()
  for (let i = 23; i >= 0; i--) {
    const h = startOfHour(subHours(now, i))
    const ts = h.getTime()
    map.set(ts, {
      hourLabel: format(h, 'HH:mm'),
      isCurrentHour: ts === currentHourStart.getTime(),
      nNormal: 0,
      nSuspicious: 0,
      nCritical: 0,
      total: 0,
    })
  }

  for (const item of items) {
    if (!item.timestamp) continue
    try {
      const d = typeof item.timestamp === 'string' ? parseISO(item.timestamp) : new Date(item.timestamp)
      const t = d.getTime()
      if (t < cutoffMs || t > now.getTime()) continue
      const hs = startOfHour(d).getTime()
      const bucket = map.get(hs)
      if (!bucket) continue
      bucket.total += 1
      const tier = classifyTier(item.anomaly_score)
      if (tier === 'critical') bucket.nCritical += 1
      else if (tier === 'suspicious') bucket.nSuspicious += 1
      else bucket.nNormal += 1
    } catch {
      /* skip bad dates */
    }
  }

  return Array.from(map.values())
}

function pct(count, total) {
  if (total <= 0) return '0.0'
  return ((count / total) * 100).toFixed(1)
}

function VolumeTooltip({ active, payload }) {
  const { t } = useLanguage()
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  const { hourLabel, total, nCritical, nSuspicious, nNormal } = row
  if (total <= 0) return null

  return (
    <div className="rounded-lg border border-border bg-popover p-3 text-sm text-popover-foreground shadow-lg">
      <p className="mb-2 font-semibold text-foreground">
        {t('dashboard.volumeHourTooltipLine', { time: hourLabel, count: total })}
      </p>
      <p className="text-muted-foreground">
        {t('dashboard.volumeTooltipCritical', { count: nCritical, percent: pct(nCritical, total) })}
      </p>
      <p className="text-muted-foreground">
        {t('dashboard.volumeTooltipSuspicious', { count: nSuspicious, percent: pct(nSuspicious, total) })}
      </p>
      <p className="text-muted-foreground">
        {t('dashboard.volumeTooltipNormal', { count: nNormal, percent: pct(nNormal, total) })}
      </p>
    </div>
  )
}

const defaultVisibility = { critical: true, suspicious: true, normal: true }

export function VolumeChart() {
  const { t } = useLanguage()
  const [visibility, setVisibility] = useState(defaultVisibility)

  const toggleTier = useCallback((tier) => {
    setVisibility((v) => ({ ...v, [tier]: !v[tier] }))
  }, [])

  const { data: rawData, isLoading, isError, refetch } = useQuery({
    queryKey: ['alerts-volume'],
    queryFn: async () => {
      const res = await safeFetch(`${API_BASE}/api/alerts?limit=${API_MAX_LIMIT}`)
      return res.json()
    },
    refetchInterval: 30000,
  })

  const baseData = useMemo(() => {
    const items = rawData?.items || []
    return bucketVolumeByHour(items)
  }, [rawData])

  const chartData = useMemo(
    () =>
      baseData.map((row) => ({
        ...row,
        normal: visibility.normal ? row.nNormal : 0,
        suspicious: visibility.suspicious ? row.nSuspicious : 0,
        critical: visibility.critical ? row.nCritical : 0,
      })),
    [baseData, visibility]
  )

  const hasData = baseData.some((d) => d.total > 0)

  const total24hTx = useMemo(() => baseData.reduce((sum, d) => sum + d.total, 0), [baseData])

  const volumeAiContext = useMemo(
    () => ({
      card: 'hourly_volume',
      summary: `Last 24h chart data — ${total24hTx} transactions`,
    }),
    [total24hTx]
  )

  const axisTick = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }
  const gridStroke = 'hsl(var(--border))'

  const chipClass = (active) =>
    cn(
      'h-8 shrink-0 gap-1 rounded-md border px-2.5 text-xs font-medium transition-opacity',
      active
        ? 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
        : 'border-dashed border-muted-foreground/60 bg-transparent text-muted-foreground opacity-50 hover:opacity-70'
    )

  return (
    <Card className="relative min-w-0 overflow-hidden">
      <CardAIButton context={volumeAiContext} label="Hourly Volume Chart" />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          {t('dashboard.transactionVolumeLast24h')}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 p-4 pt-0">
        {isLoading ? (
          <Skeleton className="h-[280px] w-full min-w-0 max-w-full" />
        ) : isError ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-muted-foreground">{t('feedback.errorLoading')}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t('actions.tryAgain')}
            </Button>
          </div>
        ) : !hasData ? (
          <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
            {t('dashboard.notEnoughData')}
          </div>
        ) : (
          <>
            <div className="w-full min-w-0 max-w-full" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                  barCategoryGap="12%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="hourLabel"
                    tick={axisTick}
                    tickLine={false}
                    axisLine={{ stroke: gridStroke }}
                    interval={0}
                    tickMargin={6}
                  />
                  <YAxis
                    tick={axisTick}
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    allowDecimals={false}
                    label={{
                      value: t('dashboard.chartTransactions'),
                      angle: -90,
                      position: 'insideLeft',
                      offset: 10,
                      style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
                    }}
                  />
                  <Tooltip content={VolumeTooltip} cursor={{ fill: 'hsl(var(--muted) / 0.15)' }} />
                  <Bar
                    dataKey="normal"
                    stackId="a"
                    name="normal"
                    fill={FILL.normal}
                    maxBarSize={28}
                    radius={[0, 0, 0, 0]}
                  >
                    {chartData.map((entry, i) => (
                      <Cell
                        key={`n-${i}`}
                        fill={FILL.normal}
                        fillOpacity={entry.isCurrentHour ? 1 : 0.72}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="suspicious"
                    stackId="a"
                    name="suspicious"
                    fill={FILL.suspicious}
                    maxBarSize={28}
                    radius={[0, 0, 0, 0]}
                  >
                    {chartData.map((entry, i) => (
                      <Cell
                        key={`s-${i}`}
                        fill={FILL.suspicious}
                        fillOpacity={entry.isCurrentHour ? 1 : 0.72}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="critical"
                    stackId="a"
                    name="critical"
                    fill={FILL.critical}
                    maxBarSize={28}
                    radius={[4, 4, 0, 0]}
                  >
                    {chartData.map((entry, i) => (
                      <Cell
                        key={`c-${i}`}
                        fill={FILL.critical}
                        fillOpacity={entry.isCurrentHour ? 1 : 0.72}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={chipClass(visibility.critical)}
                onClick={() => toggleTier('critical')}
                aria-pressed={visibility.critical}
              >
                {t('dashboard.volumeChipCritical')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={chipClass(visibility.suspicious)}
                onClick={() => toggleTier('suspicious')}
                aria-pressed={visibility.suspicious}
              >
                {t('dashboard.volumeChipSuspicious')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={chipClass(visibility.normal)}
                onClick={() => toggleTier('normal')}
                aria-pressed={visibility.normal}
              >
                {t('dashboard.volumeChipNormal')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
