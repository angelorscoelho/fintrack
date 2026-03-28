import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RotateCcw, X, Info } from 'lucide-react'
import { FILTER_OPTIONS } from '@/lib/constants'
import { useLanguage } from '@/i18n/LanguageContext'

export function FilterBar({ filters, onFilterChange, onReset, isFromUrl, onDismissBanner }) {
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
    if (onReset) {
      onReset()
    } else {
      onFilterChange({ status: '', scoreRange: '', category: '' })
    }
  }

  const hasFilters = filters.status || filters.scoreRange || filters.category

  return (
    <div className="space-y-2">
      {/* Banner: filters injected externally (e.g. via KPI card navigation) */}
      {isFromUrl && hasFilters && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{t('filters.appliedFromDashboard')}</span>
          <button
            onClick={onDismissBanner}
            className="shrink-0 rounded p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900"
            aria-label={t('actions.close')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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
            {t('actions.resetFilters')}
          </Button>
        )}
      </div>
    </div>
  )
}
