// SSE hook for real-time alerts — Implemented in Session S10E
import { useEffect } from 'react'

export function useAlertStream(onNewAlert, isIdle, setIsConnected) {
  useEffect(() => {
    // Full SSE + BroadcastChannel implementation in S10E
    // For now, mark as disconnected since no SSE is active
    setIsConnected(false)
  }, [isIdle, setIsConnected])
}
