import { useCallback, useEffect, useState } from 'react'
import { Bot } from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'

/**
 * Absolutely positioned (parent must be `relative`). Sends card context to the AI sidebar.
 */
export function CardAIButton({ context, label, prompt, absolute = true }) {
  const { openWithPrompt } = useSidebar()
  const [feedback, setFeedback] = useState(false)

  useEffect(() => {
    if (!feedback) return undefined
    const id = window.setTimeout(() => setFeedback(false), 1000)
    return () => window.clearTimeout(id)
  }, [feedback])

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation()
      e.preventDefault()
      openWithPrompt(context, prompt || null)
      setFeedback(true)
    },
    [context, openWithPrompt, prompt]
  )

  return (
    <button
      type="button"
      aria-label={label || 'Analisar com AI'}
      title="Analisar com AI"
      onClick={handleClick}
      className={cn(
        absolute ? 'absolute right-2 top-2 z-10' : 'z-10',
        'cursor-pointer rounded-sm border-0 bg-transparent p-0.5 text-muted-foreground transition-all duration-150',
        feedback ? 'opacity-100 scale-110' : 'opacity-30 hover:opacity-100 hover:scale-110'
      )}
    >
      <Bot className="h-4 w-4" aria-hidden />
    </button>
  )
}
