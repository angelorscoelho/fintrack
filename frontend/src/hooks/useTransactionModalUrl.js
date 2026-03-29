import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || ''

async function fetchAlertById(id) {
  try {
    const res = await fetch(`${API_BASE}/api/alerts/${encodeURIComponent(id)}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/**
 * Syncs transaction detail modal with `?modal={transaction_id}` search param.
 * Merges with existing query params; removes `modal` when the dialog closes.
 */
export function useTransactionModalUrl({ findInList }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedTx, setSelectedTx] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const selectedTxRef = useRef(null)
  selectedTxRef.current = selectedTx

  const modalId = searchParams.get('modal')
  const prevModalIdRef = useRef(modalId)

  const openModal = useCallback(
    (tx) => {
      if (!tx?.transaction_id) return
      setSelectedTx(tx)
      setModalOpen(true)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('modal', tx.transaction_id)
          return next
        },
        { replace: false }
      )
    },
    [setSearchParams]
  )

  const onModalOpenChange = useCallback(
    (open) => {
      if (!open) {
        setModalOpen(false)
        setSelectedTx(null)
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.delete('modal')
          return next
        })
      }
    },
    [setSearchParams]
  )

  /* Browser back / manual URL change: clear only when `modal` goes from set → unset */
  useEffect(() => {
    if (prevModalIdRef.current && !modalId) {
      setModalOpen(false)
      setSelectedTx(null)
    }
    prevModalIdRef.current = modalId
  }, [modalId])

  /* Load or refresh transaction when `modal` is present */
  useEffect(() => {
    if (!modalId) return undefined

    const local = findInList(modalId)
    if (local) {
      setSelectedTx(local)
      setModalOpen(true)
      return undefined
    }

    if (selectedTxRef.current?.transaction_id === modalId) {
      setModalOpen(true)
      return undefined
    }

    let cancelled = false
    fetchAlertById(modalId).then((tx) => {
      if (cancelled || !tx) return
      setSelectedTx(tx)
      setModalOpen(true)
    })
    return () => {
      cancelled = true
    }
  }, [modalId, findInList])

  return {
    selectedTx,
    modalOpen,
    openModal,
    onModalOpenChange,
    setSelectedTx,
  }
}
