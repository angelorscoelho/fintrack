import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/**
 * Reusable error feedback component.
 *
 * Renders a destructive Alert banner with a retry button.
 *
 * @param {string}   message  Error message shown to the user
 * @param {function} onRetry  Click handler for the retry button
 */
export function ErrorState({
  message = 'Error loading data. Please try again.',
  onRetry,
}) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="ml-3 shrink-0"
          >
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
