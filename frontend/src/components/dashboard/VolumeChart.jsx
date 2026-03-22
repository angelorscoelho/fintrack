import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, AlertTriangle } from 'lucide-react'
import { startOfHour, subHours, format, parseISO } from 'date-fns'

const API_BASE = import.meta.env.VITE_API_URL || ''

function groupByHour(items) {
  const now = new Date()
  const cutoff = subHours(now, 24)

  // Initialize 24 hour buckets
  const buckets = new Map()
  for (let i = 23; i >= 0; i--) {
    const h = startOfHour(subHours(now, i))
    const key = format(h, 'HH') + 'h'
    buckets.set(key, { hour: key, total: 0, anomalies: 0, fraudRate: 0 })
  }

  for (const item of items) {
    if (!item.timestamp) continue
    try {
      const d = typeof item.timestamp === 'string' ? parseISO(item.timestamp) : new Date(item.timestamp)
      if (d < cutoff) continue
      const key = format(startOfHour(d), 'HH') + 'h'
      const bucket = buckets.get(key)
      if (bucket) {
        bucket.total += 1
        const score = Number(item.anomaly_score || 0)
        if (score >= 0.70) bucket.anomalies += 1
      }
    } catch { /* skip bad dates */ }
  }

  // Calculate fraud rates
  for (const b of buckets.values()) {
    b.fraudRate = b.total > 0 ? Math.round((b.anomalies / b.total) * 100) : 0
  }

  return Array.from(buckets.values())
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{label}</p>
      <p className="text-slate-600 dark:text-slate-400">Total: <span className="font-medium">{data.total}</span></p>
      <p className="text-slate-600 dark:text-slate-400">Anomalias: <span className="font-medium text-red-600">{data.anomalies}</span></p>
      <p className="text-slate-600 dark:text-slate-400">Taxa Fraude: <span className="font-medium text-red-600">{data.fraudRate}%</span></p>
    </div>
  )
}

export function VolumeChart({ isDark = false }) {
  const { data: rawData, isLoading, isError, refetch } = useQuery({
    queryKey: ['alerts-volume'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/alerts?limit=200`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.json()
    },
    refetchInterval: 30000,
  })

  const chartData = useMemo(() => {
    const items = rawData?.items || []
    return groupByHour(items)
  }, [rawData])

  const hasData = chartData.some(d => d.total > 0)

  const gridColor = isDark ? '#334155' : '#e2e8f0'
  const textColor = isDark ? '#94a3b8' : '#64748b'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Volume por Hora
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-[280px] gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-muted-foreground">Erro ao carregar dados. Tente novamente.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
            Sem dados suficientes para o gráfico
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 11, fill: textColor }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: textColor }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Transações', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: textColor } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: textColor }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Fraude %', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: textColor } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={30}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar
                yAxisId="left"
                dataKey="total"
                name="Total"
                fill={isDark ? '#475569' : '#cbd5e1'}
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="fraudRate"
                name="Taxa Fraude %"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#ef4444' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
