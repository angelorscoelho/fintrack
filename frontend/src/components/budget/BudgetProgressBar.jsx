import { cn } from '@/lib/utils'

/**
 * Returns the threshold state for a budget percentage.
 * - 'normal'   → < 80%
 * - 'warning'  → ≥ 80% and < 100%
 * - 'exceeded' → ≥ 100%
 */
export function getBudgetState(percent) {
  if (percent >= 100) return 'exceeded'
  if (percent >= 80) return 'warning'
  return 'normal'
}

const BAR_COLORS = {
  normal: 'bg-blue-500 dark:bg-blue-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  exceeded: 'bg-red-500 dark:bg-red-400',
}

const LABEL_COLORS = {
  normal: 'text-muted-foreground',
  warning: 'text-amber-600 dark:text-amber-400',
  exceeded: 'text-red-600 dark:text-red-400',
}

/**
 * Visual progress bar with threshold-based coloring.
 *
 * Props:
 *   spent   — amount spent (number)
 *   limit   — budget limit (number)
 */
export function BudgetProgressBar({ spent, limit }) {
  const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0
  const clampedWidth = Math.min(percent, 100)
  const state = getBudgetState(percent)

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <div className="flex-1 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', BAR_COLORS[state])}
          style={{ width: `${clampedWidth}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percent}% of budget used`}
        />
      </div>
      <span className={cn('text-xs font-medium tabular-nums w-10 text-right', LABEL_COLORS[state])}>
        {percent}%
      </span>
    </div>
  )
}
