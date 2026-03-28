/**
 * Display label for transaction routing (IBAN → IBAN), with legacy merchant fallback.
 */
export function formatSourceDestination(tx) {
  if (!tx) return '—'
  const src = tx.source_account
  const dst = tx.destination_account
  if (src && dst) return `${src} → ${dst}`
  return tx.merchant_name || tx.merchant_nif || '—'
}
