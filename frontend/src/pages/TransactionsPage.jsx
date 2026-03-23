import { Link } from 'react-router-dom'
import { ArrowLeft, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TransactionsPage() {
  return (
    <>
      {/* Back navigation */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Page title */}
      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
      </div>

      {/* Placeholder content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Receipt className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Transaction details will appear here.</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
