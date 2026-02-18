import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Simulate from './pages/Simulate.jsx'
import History from './pages/History.jsx'
import Policy from './pages/Policy.jsx'

function NetworkBar() {
    const [net, setNet] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetch_ = () => {
            fetch('/api/network')
                .then(r => r.json())
                .then(d => { setNet(d); setLoading(false) })
                .catch(() => setLoading(false))
        }
        fetch_()
        const id = setInterval(fetch_, 15000)
        return () => clearInterval(id)
    }, [])

    return (
        <div className="network-pill">
            <div className={`dot ${!net ? 'offline' : ''}`} />
            {loading ? (
                <span className="dim">Connecting…</span>
            ) : net && !net.error ? (
                <>
                    <span className="dim">SEPOLIA</span>
                    <span>#{net.block?.toLocaleString()}</span>
                    <span className="dim">|</span>
                    <span>{net.gas_price_gwei?.toFixed(2)} Gwei</span>
                </>
            ) : (
                <span className="bad">RPC Offline</span>
            )}
        </div>
    )
}

function Sidebar() {
    const loc = useLocation()
    const nav = [
        { to: '/', icon: '⬡', label: 'Simulate' },
        { to: '/history', icon: '▤', label: 'History' },
        { to: '/policy', icon: '⚙', label: 'Policy' },
    ]
    return (
        <aside className="sidebar">
            <div className="sidebar-section">
                <div className="sidebar-label">Navigation</div>
                {nav.map(n => (
                    <NavLink
                        key={n.to}
                        to={n.to}
                        end={n.to === '/'}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{n.icon}</span>
                        {n.label}
                    </NavLink>
                ))}
            </div>
            <div className="sidebar-section">
                <div className="sidebar-label">Network</div>
                <div style={{ padding: '0 8px', fontSize: '0.72rem', color: 'var(--dim)', lineHeight: 1.8 }}>
                    <div>Ethereum Sepolia</div>
                    <div>Chain ID: 11155111</div>
                    <div>Engine: Python 3</div>
                    <div>Bridge: Node.js SSE</div>
                </div>
            </div>
        </aside>
    )
}

function App() {
    return (
        <BrowserRouter>
            <div className="app">
                <header className="header">
                    <NavLink to="/" className="header-logo">
                        <div className="header-logo-mark">SG</div>
                        <div>
                            <div className="header-logo-text">SHADOWGUARD</div>
                            <div className="header-logo-sub">Pre-Execution Security Proxy</div>
                        </div>
                    </NavLink>
                    <NetworkBar />
                </header>
                <div className="main-content">
                    <Sidebar />
                    <main>
                        <Routes>
                            <Route path="/" element={<Simulate />} />
                            <Route path="/history" element={<History />} />
                            <Route path="/policy" element={<Policy />} />
                        </Routes>
                    </main>
                </div>
            </div>
        </BrowserRouter>
    )
}

export default App
