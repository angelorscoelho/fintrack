import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os estados' },
  { value: 'PENDING_REVIEW', label: 'Pendente Revisão' },
  { value: 'CONFIRMED_FRAUD', label: 'Fraude Confirmada' },
  { value: 'FALSE_POSITIVE', label: 'Falso Positivo' },
  { value: 'ESCALATED', label: 'Escalado' },
  { value: 'NORMAL', label: 'Normal' },
]

const SCORE_OPTIONS = [
  { value: 'all', label: 'Todos os scores' },
  { value: '0.90-1.00', label: '≥ 90% — Crítico' },
  { value: '0.70-0.90', label: '70–90% — Alto' },
  { value: '0.40-0.70', label: '40–70% — Médio' },
  { value: '0.00-0.40', label: '< 40% — Baixo' },
]

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Todas as categorias' },
  { value: 'online_purchase', label: 'Compra online' },
  { value: 'in_store', label: 'Em loja' },
  { value: 'atm_withdrawal', label: 'Levantamento ATM' },
  { value: 'wire_transfer', label: 'Transferência' },
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
          <SelectValue placeholder="Estado" />
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
          <SelectValue placeholder="Categoria" />
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
          Limpar
        </Button>
      )}
    </div>
  )
}
