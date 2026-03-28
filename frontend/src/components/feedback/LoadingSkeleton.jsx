import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Skeleton placeholder for a single KPI / dashboard card.
 */
export function DashboardCardSkeleton() {
  return (
    <Card className="min-w-[160px] snap-start shrink-0 md:shrink md:min-w-0">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
        <Skeleton className="h-8 w-20 mb-1" />
        <Skeleton className="h-3 w-14" />
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton row placeholder for a data table.
 * @param {number} rows  Number of skeleton rows to display (default 5)
 * @param {number} cols  Number of columns (default 6)
 */
export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="overflow-x-auto" aria-busy="true" aria-label="Loading data">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-full max-w-[80px]" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className="border-b last:border-0">
              {Array.from({ length: cols }).map((_, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  <Skeleton
                    className={cn(
                      'h-4',
                      colIdx === 0 ? 'w-28' : colIdx === cols - 1 ? 'w-16' : 'w-full max-w-[100px]',
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Skeleton placeholder for a chart panel.
 * @param {string} height  Tailwind height class for the chart area (default "h-[280px]")
 * @param {string} title   Optional card title to show above the skeleton
 */
export function ChartSkeleton({ height = 'h-[280px]', title }) {
  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
      )}
      <CardContent className={title ? 'p-4 pt-0' : 'p-4'}>
        <div className={`${height} w-full flex flex-col gap-2 justify-end`} aria-busy="true" aria-label="Loading chart">
          {/* Simulate bar chart silhouette */}
          <div className="flex items-end gap-1 h-full px-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t"
                style={{ height: `${25 + ((i * 37 + 17) % 60)}%` }}
              />
            ))}
          </div>
          {/* X-axis labels */}
          <div className="flex gap-1 px-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="flex-1 h-3" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
