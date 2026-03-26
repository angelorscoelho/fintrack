import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PieChartIcon, AlertTriangle } from 'lucide-react'
import { safeFetch } from '@/lib/api'
import { API_MAX_LIMIT } from '@/lib/constants'
import { useLanguage } from '@/i18n/LanguageContext'

const API_BASE = import.meta.env.VITE_API_URL || ''

const CATEGORY_COLORS = {
  retail: '#3b82f6',
  online: '#8b5cf6',
  restaurant: '#f59e0b',
  gas_station: '#64748b',
  supermarket: '#22c55e',
  electronics: '#06b6d4',
  travel: '#ef4444',
  pharmacy: '#ec4899',
}

const CATEGORY_KEYS = {
  retail: 'categories.retail',
  online: 'categories.online',
  restaurant: 'categories.restaurant',
  gas_station: 'categories.gasStation',
  supermarket: 'categories.supermarket',
  electronics: 'categories.electronics',
  travel: 'categories.travel',
  pharmacy: 'categories.pharmacy',
}

function groupByCategory(items, t) {
  const acc = {}

  for (const item of items) {
    const cat = item.category || 'unknown'
    if (!acc[cat]) {
      acc[cat] = { category: cat, count: 0, totalAmount: 0 }
    }
    acc[cat].count += 1
    acc[cat].totalAmount += Number(item.amount || 0)
  }

  const total = items.length
  return Object.values(acc)
    .map((entry) => ({
      ...entry,
      label: CATEGORY_KEYS[entry.category] ? t(CATEGORY_KEYS[entry.category]) : entry.category,
      percentage: total > 0 ? (entry.count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

function CustomTooltip({ active, payload, t }) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{data.label}</p>
      <p className="text-slate-600 dark:text-slate-400">
        {t('dashboard.tooltipPercentage', { value: data.percentage.toFixed(1) })}
      </p>
      <p className="text-slate-600 dark:text-slate-400">
        {t('dashboard.tooltipTotalAmount', { value: data.totalAmount.toFixed(2) })}
      </p>
      <p className="text-slate-600 dark:text-slate-400">
        {t('dashboard.tooltipTransactions', { count: data.count })}
      </p>
    </div>
  )
}

export function CategoryChart() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const { data: rawData, isLoading, isError, refetch } = useQuery({
    queryKey: ['alerts-category'],
    queryFn: async () => {
      const res = await safeFetch(`${API_BASE}/api/alerts?limit=${API_MAX_LIMIT}`)
      return res.json()
    },
    refetchInterval: 30000,
  })

  const chartData = useMemo(() => {
    const items = rawData?.items || []
    return groupByCategory(items, t)
  }, [rawData, t])

  const hasData = chartData.length > 0

  const handleClick = (entry) => {
    if (entry?.category) {
      navigate(`/transactions?category=${encodeURIComponent(entry.category)}`)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          {t('dashboard.transactionsByCategory')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-[280px] gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-muted-foreground">{t('feedback.errorLoading')}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>{t('actions.tryAgain')}</Button>
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
            {t('dashboard.noCategoryData')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="45%"
                outerRadius={90}
                innerRadius={45}
                paddingAngle={2}
                cursor="pointer"
                isAnimationActive={false}
                onClick={handleClick}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={CATEGORY_COLORS[entry.category] || '#94a3b8'}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip t={t} />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
