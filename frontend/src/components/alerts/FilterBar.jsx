import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { FILTER_OPTIONS } from '@/lib/constants'
import { useLanguage } from '@/i18n/LanguageContext'

export function FilterBar({ filters, onFilterChange }) {
  const { t } = useLanguage()

  const STATUS_OPTIONS = [
    { value: 'all', label: t('filters.allStatuses') },
    { value: 'PENDING_REVIEW', label: t('status.pendingReview') },
    { value: 'CONFIRMED_FRAUD', label: t('status.confirmedFraud') },
    { value: 'FALSE_POSITIVE', label: t('status.falsePositive') },
    { value: 'ESCALATED', label: t('status.escalated') },
    { value: 'NORMAL', label: t('status.normal') },
  ]

  const SCORE_OPTIONS = [
    { value: 'all', label: t('filters.allScores') },
    ...FILTER_OPTIONS,
  ]

  const CATEGORY_OPTIONS = [
    { value: 'all', label: t('filters.allCategories') },
    { value: 'online_purchase', label: t('categories.onlinePurchase') },
    { value: 'in_store', label: t('categories.inStore') },
    { value: 'atm_withdrawal', label: t('categories.atmWithdrawal') },
    { value: 'wire_transfer', label: t('categories.wireTransfer') },
    { value: 'contactless', label: t('categories.contactless') },
  ]

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
          <SelectValue placeholder={t('filters.status')} />
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
          <SelectValue placeholder={t('filters.score')} />
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
          <SelectValue placeholder={t('filters.category')} />
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
          {t('actions.clear')}
        </Button>
      )}
    </div>
  )
}
