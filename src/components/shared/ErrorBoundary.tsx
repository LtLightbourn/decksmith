import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: 120,
            background: '#0a0805',
            padding: '24px 16px',
          }}
        >
          <p
            className="text-body"
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              color: '#c9a060',
              letterSpacing: 2,
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            Something went wrong
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-label"
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: '#c9a060',
              background: 'rgba(30,22,10,0.8)',
              border: '1px solid rgba(120,95,55,0.4)',
              borderRadius: 2,
              padding: '6px 16px',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
