import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export default function Transactions() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <h2 className="text-lg font-semibold text-slate-700">Today's Transactions</h2>
        <p className="text-sm">Detailed transaction view for the current day.</p>
      </div>
    </div>
  )
}
