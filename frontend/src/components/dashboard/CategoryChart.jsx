import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PieChartIcon, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTransactionData } from '@/hooks/useTransactionData'
import { useLanguage } from '@/i18n/LanguageContext'
import { CardAIButton } from '@/components/ai-sidebar/CardAIButton'

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
  const pct = data.percentage.toFixed(1)
  return (
    <div className="rounded-lg border border-border bg-popover p-3 text-sm text-popover-foreground shadow-md">
      <p className="mb-2 font-semibold leading-tight">{data.label}</p>
      <p className="tabular-nums text-foreground">
        {t('dashboard.categoryPieCardinal', { count: data.count })}
      </p>
      <p className="mt-1 text-muted-foreground">
        {t('dashboard.categoryPieShare', { percent: pct })}
      </p>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        {t('dashboard.categoryPieAmount', { value: data.totalAmount.toFixed(2) })}
      </p>
    </div>
  )
}

export function CategoryChart() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const { data, isLoading, error, refetch } = useTransactionData()

  const chartData = useMemo(() => {
    const items = data?.alerts || []
    return groupByCategory(items, t)
  }, [data, t])

  const hasData = chartData.length > 0

  const categoryAiContext = useMemo(
    () => ({
      card: 'category_distribution',
      categories: chartData.map((c) => ({ name: c.label, count: c.count })),
    }),
    [chartData]
  )

  const handleClick = (entry) => {
    if (entry?.category) {
      navigate(`/transactions?category=${encodeURIComponent(entry.category)}`)
    }
  }

  return (
    <Card
      className={cn(
        'relative h-full min-w-[160px] snap-start shrink-0 transition-shadow duration-200 md:min-w-0 md:shrink',
        'hover:shadow-lg',
      )}
    >
      <CardAIButton context={categoryAiContext} label="Category Distribution" />
      <CardContent className="flex h-full flex-col p-4 md:p-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('dashboard.transactionsByCategory')}
          </span>
          <PieChartIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>

        {isLoading ? (
          <div className="flex flex-1 flex-col justify-center">
            <Skeleton className="mx-auto aspect-square w-[min(100%,7.5rem)] rounded-full" />
          </div>
        ) : error ? (
          <div className="flex min-h-[132px] flex-col items-center justify-center gap-2 py-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <p className="text-center text-xs text-muted-foreground">{t('feedback.errorLoading')}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t('actions.tryAgain')}
            </Button>
          </div>
        ) : !hasData ? (
          <div className="flex min-h-[132px] items-center justify-center text-center text-xs text-muted-foreground">
            {t('dashboard.noCategoryData')}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col justify-center">
            <div className="h-[140px] w-full">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={58}
                    innerRadius={30}
                    paddingAngle={2}
                    cursor="pointer"
                    isAnimationActive={false}
                    onClick={handleClick}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip t={t} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
