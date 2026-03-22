import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const VARIANT_STYLES = {
  default: '',
  warning: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
  critical: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
}

export function KPICard({ title, value, change, trend, variant = 'default', icon: Icon, loading = false }) {
  const variantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.default

  // For fraud metrics (critical/warning), positive change is bad (red), negative is good (green)
  const isFraudMetric = variant === 'critical' || variant === 'warning'
  const changeIsPositive = change > 0
  const changeColor = isFraudMetric
    ? (changeIsPositive ? 'text-red-600' : 'text-green-600')
    : (changeIsPositive ? 'text-green-600' : 'text-red-600')
  const ChangeIcon = changeIsPositive ? TrendingUp : TrendingDown

  return (
    <Card className={cn('min-w-[160px] snap-start shrink-0 md:shrink md:min-w-0', variantClass)}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {title}
          </span>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-4 w-14" />
          </div>
        ) : (
          <>
            <p className="text-2xl md:text-3xl font-bold text-foreground leading-none">
              {value ?? '–'}
            </p>
            {change != null && (
              <div className={cn('flex items-center gap-1 mt-1 text-xs font-medium', changeColor)}>
                <ChangeIcon className="h-3 w-3" />
                <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
