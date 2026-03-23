import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'CONFIRMED_FRAUD', label: 'Confirmed Fraud' },
  { value: 'FALSE_POSITIVE', label: 'False Positive' },
  { value: 'ESCALATED', label: 'Escalated' },
  { value: 'NORMAL', label: 'Normal' },
]

const SCORE_OPTIONS = [
  { value: 'all', label: 'All scores' },
  { value: '0.90-1.00', label: '≥ 90% — Critical' },
  { value: '0.70-0.90', label: '70–90% — High' },
  { value: '0.40-0.70', label: '40–70% — Medium' },
  { value: '0.00-0.40', label: '< 40% — Low' },
]

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All categories' },
  { value: 'online_purchase', label: 'Online Purchase' },
  { value: 'in_store', label: 'In Store' },
  { value: 'atm_withdrawal', label: 'ATM Withdrawal' },
  { value: 'wire_transfer', label: 'Wire Transfer' },
  { value: 'contactless', label: 'Contactless' },
]

export function FilterBar({ filters, onFilterChange }) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value === 'all' ? '' : value })
  }

  const handleReset = () => {
    onFilterChange({ status: '', scoreRange: '', category: '' })
  }

  const hasFilters = filters.status || filters.scoreRange || filters.category

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={filters.status || 'all'}
        onValueChange={(v) => handleChange('status', v)}
      >
        <SelectTrigger className="w-[180px] h-9 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.scoreRange || 'all'}
        onValueChange={(v) => handleChange('scoreRange', v)}
      >
        <SelectTrigger className="w-[180px] h-9 text-xs">
          <SelectValue placeholder="Score" />
        </SelectTrigger>
        <SelectContent>
          {SCORE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.category || 'all'}
        onValueChange={(v) => handleChange('category', v)}
      >
        <SelectTrigger className="w-[180px] h-9 text-xs">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={handleReset} className="h-9 text-xs gap-1.5">
          <RotateCcw className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  )
}
