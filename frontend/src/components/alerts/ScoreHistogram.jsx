import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const BUCKETS = [
  { key: '0-20', label: '0–20%', min: 0, max: 0.20, color: '#94a3b8' },
  { key: '20-40', label: '20–40%', min: 0.20, max: 0.40, color: '#94a3b8' },
  { key: '40-60', label: '40–60%', min: 0.40, max: 0.60, color: '#f59e0b' },
  { key: '60-70', label: '60–70%', min: 0.60, max: 0.70, color: '#f59e0b' },
  { key: '70-80', label: '70–80%', min: 0.70, max: 0.80, color: '#f97316' },
  { key: '80-90', label: '80–90%', min: 0.80, max: 0.90, color: '#f97316' },
  { key: '90-100', label: '90–100%', min: 0.90, max: 1.01, color: '#ef4444' },
]

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
