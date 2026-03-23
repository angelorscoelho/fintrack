import { useEffect, useRef, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const CH = 'fintrack-sse-coordinator'
const MSG = {
  REQUEST_LEADER: 'REQUEST_LEADER',
  I_AM_LEADER: 'I_AM_LEADER',
  LEADER_CLOSING: 'LEADER_CLOSING',
  NEW_ALERT: 'NEW_ALERT',
}

export function useAlertStream(onNewAlert, isIdle, setIsConnected) {
  const cbRef = useRef(onNewAlert)
  const idleRef = useRef(isIdle)
  const isLeader = useRef(false)
  const esRef = useRef(null)
  const chRef = useRef(null)
  const elTimer = useRef(null)

  cbRef.current = onNewAlert
  idleRef.current = isIdle

  const openSSE = useCallback(() => {
    if (esRef.current || idleRef.current || document.hidden) return
    try {
      const es = new EventSource(`${API_BASE}/api/alerts/stream`)
      esRef.current = es
      es.onopen = () => setIsConnected?.(true)
      es.onmessage = (ev) => {
        if (!ev.data || ev.data.startsWith(':')) return
        try {
          const a = JSON.parse(ev.data)
          if (a.error || !a.transaction_id) return
          cbRef.current(a)
          chRef.current?.postMessage({ type: MSG.NEW_ALERT, data: a })
        } catch { /* ignore parse errors */ }
      }
      es.onerror = () => {
        // Close and nullify on error to avoid reconnect loops when backend is down
        es.close()
        esRef.current = null
        setIsConnected?.(false)
      }
    } catch { setIsConnected?.(false) }
  }, [setIsConnected])

  const closeSSE = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
    setIsConnected?.(false)
  }, [setIsConnected])

  const claimLeadership = useCallback(() => {
    isLeader.current = true
    chRef.current?.postMessage({ type: MSG.I_AM_LEADER })
    openSSE()
  }, [openSSE])

  const startElection = useCallback(() => {
    chRef.current?.postMessage({ type: MSG.REQUEST_LEADER })
    elTimer.current = setTimeout(() => {
      if (!isLeader.current) claimLeadership()
    }, 500)
  }, [claimLeadership])

  const handleVis = useCallback(() => {
    if (!isLeader.current) return
    if (document.hidden) {
      closeSSE()
    } else if (!idleRef.current) {
      openSSE()
    }
  }, [openSSE, closeSSE])

  // React to idle state changes
  useEffect(() => {
    if (isIdle && isLeader.current) closeSSE()
    else if (!isIdle && isLeader.current && !document.hidden) openSSE()
  }, [isIdle, openSSE, closeSSE])

  // BroadcastChannel setup + leader election
  useEffect(() => {
    const ch = new BroadcastChannel(CH)
    chRef.current = ch

    ch.onmessage = ({ data: msg }) => {
      const { type, data: payload } = msg || {}
      switch (type) {
        case MSG.REQUEST_LEADER:
          if (isLeader.current) ch.postMessage({ type: MSG.I_AM_LEADER })
          break
        case MSG.I_AM_LEADER:
          clearTimeout(elTimer.current)
          isLeader.current = false
          closeSSE()
          break
        case MSG.LEADER_CLOSING:
          startElection()
          break
        case MSG.NEW_ALERT:
          if (!isLeader.current && payload?.transaction_id) cbRef.current(payload)
          break
      }
    }

    startElection()
    document.addEventListener('visibilitychange', handleVis)

    return () => {
      if (isLeader.current) ch.postMessage({ type: MSG.LEADER_CLOSING })
      clearTimeout(elTimer.current)
      closeSSE()
      document.removeEventListener('visibilitychange', handleVis)
      ch.close()
    }
  }, [startElection, claimLeadership, closeSSE, handleVis])
}
