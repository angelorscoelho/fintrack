import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatSourceDestination } from '@/lib/formatTransaction'

const categoryColors = {
  retail: 'secondary',
  online: 'default',
  restaurant: 'warning',
  gas_station: 'outline',
  supermarket: 'success',
  electronics: 'default',
  travel: 'destructive',
  pharmacy: 'secondary',
}

export function TransactionDetailModal({ transaction, open, onOpenChange }) {
  if (!transaction) return null

  const formattedDate = transaction.timestamp
    ? format(new Date(transaction.timestamp), 'PPpp')
    : '—'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            {transaction.transaction_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source → Destination */}
          <div className="flex justify-between items-start gap-4">
            <span className="text-sm text-muted-foreground shrink-0">Source → Destination</span>
            <span className="text-sm font-medium text-right break-words max-w-[70%]">
              {formatSourceDestination(transaction)}
            </span>
          </div>

          {transaction.payment_platform && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Payment</span>
              <span className="text-sm capitalize">{transaction.payment_platform.replace(/_/g, ' ')}</span>
            </div>
          )}

          {(transaction.source_country || transaction.destination_country) && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Route</span>
              <span className="text-sm font-mono">
                {(transaction.source_country || '—') + ' → ' + (transaction.destination_country || '—')}
              </span>
            </div>
          )}

          {(transaction.merchant_name || transaction.merchant_nif) && (
            <div className="flex justify-between items-start gap-4">
              <span className="text-sm text-muted-foreground shrink-0">Merchant (legacy)</span>
              <span className="text-sm text-right break-words max-w-[70%]">
                {transaction.merchant_name || transaction.merchant_nif}
              </span>
            </div>
          )}

          {/* Category */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Category</span>
            <Badge variant={categoryColors[transaction.category] || 'outline'}>
              {transaction.category}
            </Badge>
          </div>

          {/* Amount */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-lg font-semibold">
              €{Number(transaction.amount).toFixed(2)}
            </span>
          </div>

          {/* Date */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Date</span>
            <span className="text-sm">{formattedDate}</span>
          </div>

          {/* Status */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge
              variant={
                transaction.status === 'NORMAL'
                  ? 'success'
                  : transaction.status === 'PENDING_REVIEW'
                    ? 'warning'
                    : 'secondary'
              }
            >
              {transaction.status}
            </Badge>
          </div>

          {/* Anomaly Score */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Anomaly Score</span>
            <span className="text-sm font-mono">
              {(Number(transaction.anomaly_score) * 100).toFixed(1)}%
            </span>
          </div>

          {/* Country (ML feature — legacy) */}
          {transaction.merchant_country && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Merchant country</span>
              <span className="text-sm">{transaction.merchant_country}</span>
            </div>
          )}

          {/* Notes (analyst_notes) */}
          {transaction.analyst_notes && (
            <div className="border-t pt-3">
              <span className="text-sm text-muted-foreground block mb-1">Notes</span>
              <p className="text-sm bg-muted rounded-md p-3">
                {transaction.analyst_notes}
              </p>
            </div>
          )}

          {/* AI Explanation */}
          {transaction.ai_explanation && (
            <div className="border-t pt-3">
              <span className="text-sm text-muted-foreground block mb-1">AI Analysis</span>
              <p className="text-sm bg-muted rounded-md p-3">
                {(() => {
                  const explanation = transaction.ai_explanation
                  if (typeof explanation === 'string') {
                    try {
                      const parsed = JSON.parse(explanation)
                      return parsed.summary_pt || explanation
                    } catch {
                      return explanation
                    }
                  }
                  return explanation.summary_pt || JSON.stringify(explanation)
                })()}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
