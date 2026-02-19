/**
 * Developer Portal — API Key Management
 * Uses simple backend JWT auth (no Firebase required)
 */

import { useState, useEffect } from 'react'

const PLANS = [
    { id: 'demo', name: 'Demo', requests: '100 / month', price: 'Free', color: '#10b981', highlight: false, cta: 'Current Plan' },
    { id: 'starter', name: 'Starter', requests: '1,000 / month', price: '$20', period: '/month', color: '#3b82f6', highlight: false, cta: 'Get Started' },
    { id: 'professional', name: 'Professional', requests: '10,000 / month', price: '$60', period: '/month', color: '#8b5cf6', highlight: true, cta: 'Go Pro' },
    { id: 'enterprise', name: 'Enterprise', requests: 'Unlimited', price: 'Contact Us', color: '#f59e0b', highlight: false, cta: 'Contact Sales' },
]

const CODE_EXAMPLES = {
    curl: `curl -X POST https://api.shadowguard.io/api/v1/simulate \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "0xYOUR_ADDRESS",
    "to":   "0xCONTRACT_ADDRESS",
    "value": 0,
    "data": "0xa9059cbb...",
    "gas": 200000
  }'`,
    node: `import fetch from 'node-fetch'

const resp = await fetch('https://api.shadowguard.io/api/v1/simulate', {
  method: 'POST',
  headers: {
    'X-API-Key': 'YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from:  '0xYOUR_ADDRESS',
    to:    '0xCONTRACT_ADDRESS',
    value: 0,
    data:  '0xa9059cbb...',
    gas:   200000,
  }),
})
const result = await resp.json()
console.log(result.risk_level, result.threats)`,
    python: `import requests

resp = requests.post(
    "https://api.shadowguard.io/api/v1/simulate",
    headers={"X-API-Key": "YOUR_API_KEY"},
    json={
        "from":  "0xYOUR_ADDRESS",
        "to":    "0xCONTRACT_ADDRESS",
        "value": 0,
        "data":  "0xa9059cbb...",
        "gas":   200000,
    },
)
print(resp.json()["risk_level"], resp.json()["threats"])`,
}

// ── Auth token storage ─────────────────────────────────────────────────────────
const TOKEN_KEY = 'sg_dev_token'
const getToken = () => localStorage.getItem(TOKEN_KEY)
const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// ── Auth form component ────────────────────────────────────────────────────────
function AuthForm({ onUser }) {
    const [mode, setMode] = useState('login') // 'login' | 'signup'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const submit = async (e) => {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login'
            const body = mode === 'signup' ? { email, password, name } : { email, password }
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await resp.json()
            if (!resp.ok) throw new Error(data.error || 'Authentication failed')
            setToken(data.token)
            onUser(data.user, data.token)
        } catch (e) { setError(e.message) } finally { setLoading(false) }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', gap: 24 }}>
            <div style={{ background: 'var(--surface)', border: '2px solid var(--border)', padding: '2rem', width: '100%', maxWidth: 440 }}>
                <h2 style={{ marginBottom: 4, fontSize: '1.4rem', fontWeight: 800 }}>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                </h2>
                <p style={{ color: 'var(--dim)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                    Developer Portal — API Key Management
                </p>

                {error && <div style={{ background: '#ff000015', border: '1px solid #ff000060', color: '#ff6b6b', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {mode === 'signup' && (
                        <input
                            placeholder="Display name (optional)"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            style={{ padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' }}
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        style={{ padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' }}
                    />
                    <input
                        type="password"
                        placeholder={mode === 'signup' ? 'Password (min 6 chars)' : 'Password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        style={{ padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' }}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        style={{ padding: '0.85rem', background: 'var(--accent)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: loading ? 0.6 : 1 }}
                    >
                        {loading ? '...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <p style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--dim)', textAlign: 'center' }}>
                    {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                    <span onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 700 }}>
                        {mode === 'login' ? 'Sign Up' : 'Sign In'}
                    </span>
                </p>
            </div>
        </div>
    )
}

// ── Main Developer portal ──────────────────────────────────────────────────────
export default function Developer() {
    const [user, setUser] = useState(null)
    const [token, setTokenState] = useState(null)
    const [loadingAuth, setLoadingAuth] = useState(true)
    const [tab, setTab] = useState('keys')
    const [keys, setKeys] = useState([])
    const [newKeyName, setNewKeyName] = useState('')
    const [newKeyPlan, setNewKeyPlan] = useState('demo')
    const [revealedKey, setRevealedKey] = useState(null) // { id, raw }
    const [copiedId, setCopiedId] = useState(null)
    const [example, setExample] = useState('curl')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        const stored = getToken()
        if (!stored) { setLoadingAuth(false); return }
        // Verify token with backend
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
            .then(r => r.json())
            .then(d => {
                if (d.user) { setUser(d.user); setTokenState(stored) }
                else clearToken()
            })
            .catch(() => clearToken())
            .finally(() => setLoadingAuth(false))
    }, [])

    const onUser = (u, t) => { setUser(u); setTokenState(t) }

    const authHeader = () => ({ Authorization: `Bearer ${token}` })

    const fetchKeys = async () => {
        try {
            const r = await fetch('/api/developer/keys', { headers: authHeader() })
            const d = await r.json()
            if (r.ok) setKeys(d.keys || [])
        } catch (e) { setError(e.message) }
    }

    useEffect(() => { if (user && token) fetchKeys() }, [user, token])

    const createKey = async () => {
        if (!newKeyName.trim()) return setError('Key name is required')
        setError(''); setSuccess('')
        try {
            const r = await fetch('/api/developer/keys', {
                method: 'POST',
                headers: { ...authHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName, plan: newKeyPlan }),
            })
            const d = await r.json()
            if (!r.ok) throw new Error(d.error || 'Failed to create key')
            setRevealedKey({ id: d.key.id, raw: d.raw_key })
            setNewKeyName(''); setSuccess('API key created! Copy it now — it won\'t be shown again.')
            fetchKeys()
        } catch (e) { setError(e.message) }
    }

    const deleteKey = async (id) => {
        if (!confirm('Delete this API key? This cannot be undone.')) return
        try {
            const r = await fetch(`/api/developer/keys/${id}`, { method: 'DELETE', headers: authHeader() })
            if (r.ok) { fetchKeys(); if (revealedKey?.id === id) setRevealedKey(null) }
        } catch (e) { setError(e.message) }
    }

    const copyText = (text, id) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(id); setTimeout(() => setCopiedId(null), 2000)
        })
    }

    if (loadingAuth) return <div style={{ padding: '3rem', color: 'var(--dim)' }}>Loading…</div>
    if (!user) return <AuthForm onUser={onUser} />

    const cardStyle = { background: 'var(--surface)', border: '2px solid var(--border)', padding: '1.25rem', marginBottom: 12 }
    const btnStyle = (bg = 'var(--accent)', col = '#000') => ({ padding: '0.5rem 1rem', background: bg, color: col, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' })

    return (
        <div style={{ padding: '1.5rem', maxWidth: 900 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }}>Developer Portal</h1>
                    <p style={{ color: 'var(--dim)', fontSize: '0.82rem' }}>{user.email}</p>
                </div>
                <button style={btnStyle('transparent', 'var(--dim)')} onClick={() => { clearToken(); setUser(null); setKeys([]) }}>Sign Out</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, marginBottom: '1.5rem', borderBottom: '2px solid var(--border)' }}>
                {[['keys', 'API Keys'], ['pricing', 'Pricing'], ['docs', 'Integration']].map(([id, label]) => (
                    <button key={id} onClick={() => setTab(id)} style={{ padding: '0.6rem 1.2rem', background: tab === id ? 'var(--accent)' : 'transparent', color: tab === id ? '#000' : 'var(--dim)', border: 'none', cursor: 'pointer', fontWeight: tab === id ? 800 : 500, fontSize: '0.85rem' }}>{label}</button>
                ))}
            </div>

            {error && <div style={{ background: '#ff000015', border: '1px solid #ff000060', color: '#ff6b6b', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{error} <span style={{ cursor: 'pointer', float: 'right' }} onClick={() => setError('')}>✕</span></div>}
            {success && <div style={{ background: '#10b98115', border: '1px solid #10b98160', color: '#10b981', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>{success} <span style={{ cursor: 'pointer', float: 'right' }} onClick={() => setSuccess('')}>✕</span></div>}

            {/* ── Keys Tab ───────────────────────────────────────────────────── */}
            {tab === 'keys' && (
                <div>
                    {/* Create key */}
                    <div style={cardStyle}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Create New API Key</h3>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <input
                                placeholder="Key name (e.g. production-monitor)"
                                value={newKeyName}
                                onChange={e => setNewKeyName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && createKey()}
                                style={{ flex: 1, minWidth: 200, padding: '0.65rem', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                            />
                            <select value={newKeyPlan} onChange={e => setNewKeyPlan(e.target.value)} style={{ padding: '0.65rem', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                                {PLANS.filter(p => p.id !== 'enterprise').map(p => <option key={p.id} value={p.id}>{p.name} — {p.requests}</option>)}
                            </select>
                            <button style={btnStyle()} onClick={createKey}>Generate Key</button>
                        </div>
                    </div>

                    {/* Reveal box */}
                    {revealedKey && (
                        <div style={{ ...cardStyle, borderColor: '#10b981', background: '#10b98110' }}>
                            <p style={{ fontSize: '0.75rem', color: '#10b981', marginBottom: 8, fontWeight: 700 }}>⚠ COPY NOW — shown only once</p>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <code style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all', color: '#10b981' }}>{revealedKey.raw}</code>
                                <button style={btnStyle('#10b981')} onClick={() => copyText(revealedKey.raw, 'revealed')}>
                                    {copiedId === 'revealed' ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Key list */}
                    {keys.length === 0 ? (
                        <div style={{ ...cardStyle, color: 'var(--dim)', textAlign: 'center', padding: '2rem' }}>No API keys yet. Create your first key above.</div>
                    ) : keys.map(k => (
                        <div key={k.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <div>
                                <span style={{ fontWeight: 700, marginRight: 8 }}>{k.name}</span>
                                <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--accent)', color: '#000', fontWeight: 700, marginRight: 8 }}>{k.plan?.toUpperCase()}</span>
                                <code style={{ fontSize: '0.75rem', color: 'var(--dim)' }}>{k.key_prefix}••••</code>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.78rem', color: 'var(--dim)' }}>
                                <span>{k.request_count || 0} requests</span>
                                {k.last_used_at && <span>last used {new Date(k.last_used_at).toLocaleDateString()}</span>}
                                <button style={btnStyle('#ff000020', '#ff6b6b')} onClick={() => deleteKey(k.id)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Pricing Tab ────────────────────────────────────────────────── */}
            {tab === 'pricing' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    {PLANS.map(p => (
                        <div key={p.id} style={{ ...cardStyle, border: `2px solid ${p.highlight ? p.color : 'var(--border)'}`, position: 'relative' }}>
                            {p.highlight && <div style={{ position: 'absolute', top: -1, right: 12, background: p.color, color: '#000', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px' }}>POPULAR</div>}
                            <div style={{ color: p.color, fontWeight: 800, marginBottom: 8 }}>{p.name}</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }}>{p.price}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--dim)' }}>{p.period}</span></div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--dim)', marginBottom: '1rem' }}>{p.requests}</div>
                            <button style={{ ...btnStyle(p.highlight ? p.color : 'transparent', p.highlight ? '#000' : 'var(--dim)'), width: '100%', border: `1px solid ${p.color}` }}>{p.cta}</button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Docs Tab ───────────────────────────────────────────────────── */}
            {tab === 'docs' && (
                <div>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                        {Object.keys(CODE_EXAMPLES).map(k => (
                            <button key={k} style={btnStyle(example === k ? 'var(--accent)' : 'var(--border)', example === k ? '#000' : 'var(--text)')} onClick={() => setExample(k)}>{k}</button>
                        ))}
                    </div>
                    <div style={{ position: 'relative', ...cardStyle }}>
                        <pre style={{ margin: 0, fontSize: '0.78rem', overflowX: 'auto', color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}><code>{CODE_EXAMPLES[example]}</code></pre>
                        <button style={{ ...btnStyle(), position: 'absolute', top: 12, right: 12 }} onClick={() => copyText(CODE_EXAMPLES[example], 'code')}>
                            {copiedId === 'code' ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <div style={{ ...cardStyle, marginTop: 12, fontSize: '0.82rem', color: 'var(--dim)' }}>
                        <b style={{ color: 'var(--text)' }}>Rate limit headers</b><br />
                        Every response includes: <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>, <code>X-Plan</code><br /><br />
                        <b style={{ color: 'var(--text)' }}>Enterprise / custom limits?</b><br />
                        Email <a href="mailto:api@shadowguard.io" style={{ color: 'var(--accent)' }}>api@shadowguard.io</a>
                    </div>
                </div>
            )}
        </div>
    )
}
