import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
          <span className="text-6xl mb-4">😿</span>
          <h2 className="text-lg font-bold text-gray-800 dark:text-bark-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-500 dark:text-bark-300 mb-1 max-w-md">
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </p>
          <p className="text-xs text-gray-400 dark:text-bark-400 mb-4">
            The error has been logged to the console.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-primary text-sm px-5 py-2"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
