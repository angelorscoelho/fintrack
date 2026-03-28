/**
 * Centralised toast helpers built on top of sonner.
 *
 * Import these instead of calling `toast` directly so that
 * message copy stays consistent across the application.
 */
import { toast } from 'sonner'

export const showSuccess = (message, options) =>
  toast.success(message, { duration: 3000, ...options })

export const showError = (message, options) =>
  toast.error(message, { duration: 5000, ...options })

export const showInfo = (message, options) =>
  toast.info(message, { duration: 3000, ...options })

// ── Pre-defined success messages ────────────────────────────────────────────

export const toastTransactionCreated = () =>
  showSuccess('Transaction created successfully.')

export const toastTransactionDeleted = () =>
  showSuccess('Transaction deleted.')

export const toastBudgetUpdated = (category) =>
  showSuccess(category ? `Budget updated for ${category}.` : 'Budget updated.')
