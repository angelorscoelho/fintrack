import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Wallet,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/i18n/LanguageContext'
import { safeFetch } from '@/lib/api'
import { API_MAX_LIMIT } from '@/lib/constants'
import { useBudgets } from '@/hooks/useBudgets'
import { BudgetProgressBar, getBudgetState } from '@/components/budget/BudgetProgressBar'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { toastBudgetUpdated } from '@/lib/toast'

const API_BASE = import.meta.env.VITE_API_URL || ''
const TABLE_COLS = 7  // Category, Budget Limit, Spent, Remaining, Progress, Status, Actions

const CATEGORY_LABELS = {
  retail: 'Retail',
  online: 'Online',
  restaurant: 'Restaurant',
  gas_station: 'Gas Station',
  supermarket: 'Supermarket',
  electronics: 'Electronics',
  travel: 'Travel',
  pharmacy: 'Pharmacy',
}

const STATE_BADGES = {
  normal: { key: 'budget.normal', variant: 'secondary' },
  warning: { key: 'budget.warning', variant: 'warning', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  exceeded: { key: 'budget.exceeded', variant: 'destructive' },
}

export default function BudgetPage() {
  const { budgets, updateBudget, categories } = useBudgets()
  const { t } = useLanguage()

  // Editing state: which category is being edited
  const [editingCategory, setEditingCategory] = useState(null)
  const [editValue, setEditValue] = useState('')

  // Fetch transactions to compute spending
  const { data: transactions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await safeFetch(`${API_BASE}/api/alerts?limit=${API_MAX_LIMIT}`)
      const json = await res.json()
      return Array.isArray(json) ? json : json.alerts || json.items || []
    },
  })

  // Aggregate spending per category
  const spending = useMemo(() => {
    const totals = {}
    for (const cat of categories) {
      totals[cat] = 0
    }
    for (const tx of transactions) {
      if (tx.category && totals[tx.category] !== undefined) {
        totals[tx.category] += Number(tx.amount) || 0
      }
    }
    // Round to 2 decimals
    for (const cat of categories) {
      totals[cat] = Math.round(totals[cat] * 100) / 100
    }
    return totals
  }, [transactions, categories])

  // Summary stats
  const summary = useMemo(() => {
    let totalBudget = 0
    let totalSpent = 0
    let warningCount = 0
    let exceededCount = 0

    for (const cat of categories) {
      const limit = budgets[cat]
      const spent = spending[cat]
      totalBudget += limit
      totalSpent += spent

      const percent = limit > 0 ? (spent / limit) * 100 : 0
      const state = getBudgetState(percent)
      if (state === 'warning') warningCount++
      if (state === 'exceeded') exceededCount++
    }

    return {
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalRemaining: Math.round((totalBudget - totalSpent) * 100) / 100,
      warningCount,
      exceededCount,
    }
  }, [budgets, spending, categories])

  // Edit handlers
  const startEdit = useCallback((cat) => {
    setEditingCategory(cat)
    setEditValue(String(budgets[cat]))
  }, [budgets])

  const confirmEdit = useCallback(() => {
    if (editingCategory) {
      const label = CATEGORY_LABELS[editingCategory] || editingCategory
      updateBudget(editingCategory, editValue)
      setEditingCategory(null)
      setEditValue('')
      toastBudgetUpdated(label)
    }
  }, [editingCategory, editValue, updateBudget])

  const cancelEdit = useCallback(() => {
    setEditingCategory(null)
    setEditValue('')
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') confirmEdit()
    if (e.key === 'Escape') cancelEdit()
  }, [confirmEdit, cancelEdit])

  return (
    <>
      {/* Back navigation */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('actions.backToDashboard')}
          </Link>
        </Button>
      </div>

      {/* Page header */}
      <div className="flex items-center gap-3">
        <Wallet className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('budget.title')}</h1>
          <p className="text-xs text-muted-foreground">
            {t('budget.description')}
          </p>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <ErrorState onRetry={() => refetch()} />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t('budget.totalBudget')}</p>
            <p className="text-lg font-bold text-foreground">€{summary.totalBudget.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t('budget.totalSpent')}</p>
            <p className="text-lg font-bold text-foreground">€{summary.totalSpent.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t('budget.remaining')}</p>
            <p className={`text-lg font-bold ${summary.totalRemaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
              €{summary.totalRemaining.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t('budget.alerts')}</p>
            <div className="flex items-center gap-2">
              {summary.warningCount > 0 && (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs">
                  {summary.warningCount === 1 ? `1 ${t('budget.warning').toLowerCase()}` : `${summary.warningCount} ${t('budget.warning').toLowerCase()}s`}
                </Badge>
              )}
              {summary.exceededCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {summary.exceededCount} {t('budget.exceeded')}
                </Badge>
              )}
              {summary.warningCount === 0 && summary.exceededCount === 0 && (
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{t('budget.allClear')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('budget.categoryBudgets')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={8} cols={TABLE_COLS} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('columns.category')}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('columns.budgetLimit')}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('columns.spent')}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('columns.remaining')}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground min-w-[220px]">{t('columns.progress')}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('columns.status')}</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">{t('columns.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => {
                    const limit = budgets[cat]
                    const spent = spending[cat]
                    const remaining = Math.round((limit - spent) * 100) / 100
                    const percent = limit > 0 ? (spent / limit) * 100 : 0
                    const state = getBudgetState(percent)
                    const badge = STATE_BADGES[state]
                    const isEditing = editingCategory === cat

                    return (
                      <tr key={cat} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {CATEGORY_LABELS[cat] || cat}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">€</span>
                              <input
                                type="number"
                                min="0"
                                step="10"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-24 px-2 py-1 text-sm border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <span className="tabular-nums">€{limit.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          €{spent.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <span className={remaining < 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                            €{remaining.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <BudgetProgressBar spent={spent} limit={limit} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={badge.variant}
                            className={badge.className || 'text-xs'}
                          >
                            {t(badge.key)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={confirmEdit}
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                                aria-label={t('budget.confirmEdit')}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEdit}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                                aria-label={t('budget.cancelEdit')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(cat)}
                              className="h-7 w-7 p-0"
                              aria-label={t('budget.editBudget', { category: CATEGORY_LABELS[cat] || cat })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
