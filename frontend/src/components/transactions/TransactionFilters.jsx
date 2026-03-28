import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/i18n/LanguageContext'

const CATEGORY_KEYS = [
  { value: 'retail', key: 'categories.retail' },
  { value: 'online', key: 'categories.online' },
  { value: 'restaurant', key: 'categories.restaurant' },
  { value: 'gas_station', key: 'categories.gasStation' },
  { value: 'supermarket', key: 'categories.supermarket' },
  { value: 'electronics', key: 'categories.electronics' },
  { value: 'travel', key: 'categories.travel' },
  { value: 'pharmacy', key: 'categories.pharmacy' },
]

export function TransactionFilters({
  searchQuery,
  onSearchChange,
  category,
  onCategoryChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onReset,
  hasActiveFilters,
}) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('transactions.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="w-full sm:w-[180px]">
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder={t('transactions.allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('transactions.allCategories')}</SelectItem>
            {CATEGORY_KEYS.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {t(cat.key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date range */}
      <div className="flex gap-2">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t('transactions.dateFrom')}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t('transactions.dateTo')}
        />
      </div>

      {/* Reset filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X className="h-4 w-4 mr-1" />
          {t('actions.reset')}
        </Button>
      )}
    </div>
  )
}
