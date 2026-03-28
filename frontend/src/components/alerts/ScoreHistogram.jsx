import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HISTOGRAM_BUCKETS } from '@/lib/constants'

const BUCKET_COLORS = {
  '0-20': '#94a3b8', '20-40': '#94a3b8',
  '40-60': '#f59e0b', '60-70': '#f59e0b',
  '70-80': '#f97316', '80-90': '#f97316',
  '90-100': '#ef4444',
}

const BUCKETS = HISTOGRAM_BUCKETS.map(b => ({
  ...b,
  color: BUCKET_COLORS[b.key] || '#94a3b8',
}))

export function ScoreHistogram({ alerts = [], onBucketClick, isDark = false }) {
  const data = useMemo(() => {
    return BUCKETS.map((b) => ({
      ...b,
      count: alerts.filter((a) => {
        const s = Number(a.anomaly_score || 0)
        return s >= b.min && s < b.max
      }).length,
    }))
  }, [alerts])

  const textColor = isDark ? '#94a3b8' : '#64748b'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Distribuição de Score</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: textColor }} />
            <YAxis tick={{ fontSize: 10, fill: textColor }} allowDecimals={false} />
            <Tooltip
              formatter={(value) => [`${value} alertas`, 'Contagem']}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar
              dataKey="count"
              radius={[3, 3, 0, 0]}
              cursor="pointer"
              onClick={(entry) => {
                if (onBucketClick) {
                  onBucketClick(`${entry.min.toFixed(2)}-${entry.max > 1 ? '1.00' : entry.max.toFixed(2)}`)
                }
              }}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
