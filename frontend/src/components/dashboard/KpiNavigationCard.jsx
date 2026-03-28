import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

const VARIANT_STYLES = {
  default: '',
  warning: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
  critical: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
}

export function KpiNavigationCard({
  title,
  value,
  change,
  variant = 'default',
  icon: Icon,
  loading = false,
  tooltip,
  actionTooltip,
  subLabel,
  route,
}) {
  const navigate = useNavigate()
  const variantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.default

  const isFraudMetric = variant === 'critical' || variant === 'warning'
  const changeIsPositive = change != null && change > 0
  const changeColor = isFraudMetric
    ? changeIsPositive ? 'text-red-600' : 'text-green-600'
    : changeIsPositive ? 'text-green-600' : 'text-red-600'
  const ChangeIcon = changeIsPositive ? TrendingUp : TrendingDown

  const handleNavigate = () => {
    if (route) navigate(route)
  }

  const handleCardKeyDown = (e) => {
    if (!route) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigate(route)
    }
  }

  const cardContent = (
    <Card
      className={cn(
        'min-w-[160px] snap-start shrink-0 md:shrink md:min-w-0 transition-shadow duration-200 hover:shadow-lg cursor-pointer h-full',
        variantClass
      )}
      role={route ? 'link' : undefined}
      tabIndex={route ? 0 : undefined}
      aria-label={route ? (loading ? `${title}: loading` : `${title}: ${value}`) : undefined}
      onClick={route ? handleNavigate : undefined}
      onKeyDown={route ? handleCardKeyDown : undefined}
    >
      <CardContent className="p-4 md:p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {title}
          </span>
          <div className="flex items-center gap-1">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />}
            {tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-4 w-14" />
          </div>
        ) : (
          <div className="flex flex-col flex-1 justify-center">
            <p className="text-xl md:text-2xl font-bold text-foreground leading-none">
              {value ?? '–'}
            </p>
            {change != null && (
              <div className={cn('flex items-center gap-1 mt-1 text-xs font-medium', changeColor)}>
                <ChangeIcon className="h-3 w-3" />
                <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
              </div>
            )}
            {subLabel && (
              <p className="mt-1 text-[10px] text-muted-foreground truncate">{subLabel}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const needsProvider = tooltip || actionTooltip

  const linked = route ? (
    <div className="h-full no-underline">{cardContent}</div>
  ) : (
    cardContent
  )

  const withActionTooltip = actionTooltip ? (
    <Tooltip>
      <TooltipTrigger asChild>
        {linked}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p>{actionTooltip}</p>
      </TooltipContent>
    </Tooltip>
  ) : linked

  if (needsProvider) {
    return (
      <TooltipProvider delayDuration={400}>
        {withActionTooltip}
      </TooltipProvider>
    )
  }

  return withActionTooltip
}
