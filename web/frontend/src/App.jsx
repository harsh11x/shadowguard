
import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import Simulate from './pages/Simulate.jsx'
import History from './pages/History.jsx'
import Policy from './pages/Policy.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Inspector from './pages/Inspector.jsx'
import Live from './pages/Live.jsx'
import Developer from './pages/Developer.jsx'
import Admin from './pages/Admin.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

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
        const id = setInterval(fetch_, 12000)
        return () => clearInterval(id)
    }, [])

    return (
        <div className="network-pill">
            <div className={`dot ${!net || net.error ? 'offline' : ''}`} />
            {loading ? (
                <span className="dim">Connecting…</span>
            ) : net && !net.error ? (
                <>
                    <span className="dim">{net.name || 'MAINNET'}</span>
                    <span>#{net.block?.toLocaleString()}</span>
                    <span className="dim">|</span>
                    <span>{net.gas_price_gwei} Gwei</span>
                    <span className="dim">|</span>
                    <span className="good" style={{ fontSize: '0.65rem' }}>● LIVE</span>
                </>
            ) : (
                <span className="bad">RPC Offline</span>
            )}
        </div>
    )
}

function Sidebar() {
    const nav = [
        { to: '/live', icon: '◈', label: 'Live Stream', pulse: true },
        { to: '/dashboard', icon: '◈', label: 'Dashboard' },
        { to: '/', icon: '⬡', label: 'Simulate', end: true },
        { to: '/history', icon: '▤', label: 'History' },
        { to: '/inspector', icon: '⬢', label: 'Inspector' },
        { to: '/policy', icon: '⚙', label: 'Policy' },
        { to: '/developer', icon: '🔑', label: 'Developer API' },
        { to: '/admin', icon: '🛡️', label: 'Admin Panel' },
    ]

    return (
        <aside className="sidebar">
            <div className="sidebar-section">
                <div className="sidebar-label">Navigation</div>
                {nav.map(n => (
                    <NavLink
                        key={n.to}
                        to={n.to}
                        end={n.end}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className={`nav-icon ${n.pulse ? 'pulse-slow' : ''}`}>{n.icon}</span>
                        {n.label}
                    </NavLink>
                ))}
            </div>

            <div className="sidebar-section">
                <div className="sidebar-label">Network</div>
                <div style={{ padding: '0 8px', fontSize: '0.72rem', color: 'var(--dim)', lineHeight: 1.8 }}>
                    <div>Ethereum Mainnet</div>
                    <div>Chain ID: 1</div>
                    <div>Engine: Python 3</div>
                    <div>Bridge: Node.js SSE</div>
                </div>
            </div>

            <div className="sidebar-section">
                <div className="sidebar-label">Quick Links</div>
                <div style={{ padding: '0 8px', fontSize: '0.7rem', lineHeight: 2 }}>
                    <a href="https://etherscan.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--dim)', textDecoration: 'none' }}>⬡ Etherscan ↗</a><br />
                    <a href="/api/health" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--dim)', textDecoration: 'none' }}>⬡ API Health ↗</a><br />
                    <a href="/api/export?format=csv" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--dim)', textDecoration: 'none' }}>⬡ Export CSV ↗</a>
                </div>
            </div>
        </aside>
    )
}

function MainLayout({ children }) {
    const location = useLocation();
    const isLogin = location.pathname === '/admin/login';

    if (isLogin) return <>{children}</>;

    return (
        <div className="app">
            <header className="header">
                <NavLink to="/" className="header-logo">
                    <div className="header-logo-mark">SG</div>
                    <div>
                        <div className="header-logo-text">SHADOWGUARD</div>
                        <div className="header-logo-sub">Pre-Execution Security Proxy · Ethereum Sepolia</div>
                    </div>
                </NavLink>
                <NetworkBar />
            </header>
            <div className="main-content">
                <Sidebar />
                <main>
                    {children}
                </main>
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <ErrorBoundary>
                <MainLayout>
                    <Routes>
                        <Route path="/" element={<Simulate />} />
                        <Route path="/live" element={<Live />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/inspector" element={<Inspector />} />
                        <Route path="/policy" element={<Policy />} />
                        <Route path="/developer" element={<Developer />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/admin/login" element={<AdminLogin />} />
                    </Routes>
                </MainLayout>
            </ErrorBoundary>
        </BrowserRouter>
    )
}

export default App
