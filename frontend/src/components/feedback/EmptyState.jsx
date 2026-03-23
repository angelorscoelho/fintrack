import { Button } from '@/components/ui/button'
import { PackageOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Generic empty-state component.
 *
 * @param {React.ComponentType} icon       Lucide icon component (default PackageOpen)
 * @param {string}              title      Primary heading text
 * @param {string}              description Secondary description text
 * @param {string}              actionLabel Label for the CTA button (omit to hide button)
 * @param {function}            onAction    Click handler for the CTA button
 * @param {string}              className   Extra classes applied to the wrapper
 */
export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center text-muted-foreground',
        className
      )}
      role="status"
    >
      <Icon className="h-12 w-12 mb-4 opacity-40" aria-hidden="true" />
      {title && (
        <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
      )}
      {description && (
        <p className="text-xs text-muted-foreground mb-4 max-w-xs">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
