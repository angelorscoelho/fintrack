import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * React Error Boundary – catches render errors in children and shows
 * a compact fallback instead of crashing the entire app.
 *
 * Usage:
 *   <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *     <ComponentThatMightThrow />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Unable to display this section.</span>
        </div>
      )
    }

    return this.props.children
  }
}
