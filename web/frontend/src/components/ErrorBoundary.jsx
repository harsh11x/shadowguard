
import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', color: 'var(--red)', background: '#000', minHeight: '100vh', fontFamily: 'monospace' }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>SYSTEM MALFUNCTION // RENDER ERROR</h1>
                    <p style={{ color: 'var(--dim)', marginBottom: '2rem' }}>The interface encountered a critical rendering error.</p>

                    <div style={{ background: '#111', padding: '1rem', border: '1px solid var(--red)', borderRadius: '4px', overflow: 'auto' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{this.state.error && this.state.error.toString()}</p>
                        <pre style={{ fontSize: '0.8rem', color: 'var(--dim)' }}>
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '2rem', padding: '0.5rem 1rem', background: 'var(--red)', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        REBOOT INTERFACE
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
