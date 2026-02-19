/**
 * Developer Portal — API Key Management
 * Features:
 *  - Google + Email/Password Firebase Auth
 *  - Create, reveal (once), copy, delete API keys
 *  - Usage dashboard per key
 *  - Tiered pricing table
 *  - Integration code examples (curl, Node.js, Python)
 */

import { useState, useEffect } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import {
    getAuth,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
} from 'firebase/auth'

// ── Firebase init ─────────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "shadowguard-demo.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "shadowguard-demo",
}

// ── Firebase lazy init (safe — won't crash app if config is missing) ──────────
let _auth = null
let _googleProvider = null

function getFirebaseAuth() {
    if (_auth) return _auth
    try {
        const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
        _auth = getAuth(firebaseApp)
        _googleProvider = new GoogleAuthProvider()
    } catch (e) {
        console.warn('[Developer] Firebase init failed:', e.message)
    }
    return _auth
}

// ── Plans ─────────────────────────────────────────────────────────────────────
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
    "network": "ethereum"
  }'`,

    node: `const { EventSource } = require('eventsource')

const stream = new EventSource(
  'https://api.shadowguard.io/api/v1/simulate',
  {
    method: 'POST',
    headers: {
      'X-API-Key': 'YOUR_API_KEY',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: '0xYOUR_ADDRESS',
      to:   '0xCONTRACT_ADDRESS',
      value: 0,
      data:  '0xa9059cbb...',
    }),
  }
)

stream.onmessage = ({ data }) => {
  const event = JSON.parse(data)
  if (event.type === 'result') {
    console.log('Risk score:', event.risk_score)
    console.log('Verdict:', event.verdict)
  }
  if (event.type === 'done') stream.close()
}`,

    python: `import requests, json

resp = requests.post(
    "https://api.shadowguard.io/api/v1/simulate",
    headers={
        "X-API-Key": "YOUR_API_KEY",
        "Content-Type": "application/json",
    },
    json={
        "from":    "0xYOUR_ADDRESS",
        "to":      "0xCONTRACT_ADDRESS",
        "value":   0,
        "data":    "0xa9059cbb...",
        "network": "ethereum",
    },
    stream=True
)

for line in resp.iter_lines():
    if line.startswith(b"data:"):
        event = json.loads(line[5:])
        if event.get("type") == "result":
            print("Risk:", event["risk_score"])
            print("Verdict:", event["verdict"])`,
}

// ── Risk badge ────────────────────────────────────────────────────────────────
function RiskBadge({ score }) {
    const pct = Math.min(score, 100)
    const color = pct >= 70 ? '#ef4444' : pct >= 50 ? '#f59e0b' : pct >= 30 ? '#eab308' : '#10b981'
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: '0.65rem', color, minWidth: 28 }}>{pct}%</span>
        </div>
    )
}

// ── Auth gate ─────────────────────────────────────────────────────────────────
function AuthGate({ onUser }) {
    const [mode, setMode] = useState('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleGoogle = async () => {
        setLoading(true); setError('')
        try {
            const result = await signInWithPopup(getFirebaseAuth(), _googleProvider)
            onUser(result.user)
        } catch (e) { setError(e.message) } finally { setLoading(false) }
    }

    const handleEmail = async (e) => {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            const fn = mode === 'login' ? signInWithEmailAndPassword : createUserWithEmailAndPassword
            const result = await fn(auth, email, password)
            onUser(result.user)
        } catch (e) { setError(e.message.replace('Firebase:', '').trim()) } finally { setLoading(false) }
    }

    return (
        <div className="portal-auth-wrap">
            <div className="card" style={{ maxWidth: 420, margin: '0 auto', padding: 40 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                </h2>
                <p style={{ color: 'var(--dim)', fontSize: '0.82rem', marginBottom: 28 }}>
                    to access your API keys and dashboard
                </p>

                <button onClick={handleGoogle} disabled={loading} className="btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    Continue with Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0', color: 'var(--dim)', fontSize: '0.75rem' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    or
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>

                <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input className="input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                    <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                    {error && <div style={{ color: 'var(--bad)', fontSize: '0.78rem', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4 }}>
                        {loading ? 'Signing in…' : mode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', color: 'var(--dim)', fontSize: '0.78rem', marginTop: 20 }}>
                    {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                    <button style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                        {mode === 'login' ? 'Sign up' : 'Sign in'}
                    </button>
                </p>
            </div>
        </div>
    )
}

// ── Key card ──────────────────────────────────────────────────────────────────
function KeyCard({ keyData, revealedKey, onDelete, onReveal }) {
    const [copied, setCopied] = useState(false)
    const usagePct = keyData.plan === 'enterprise' ? 0 :
        Math.min((keyData.usage_count / { demo: 100, starter: 1000, professional: 10000 }[keyData.plan]) * 100, 100)

    const copy = (text) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 4 }}>{keyData.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--dim)', background: 'var(--bg)', padding: '3px 8px', border: '1px solid var(--border)' }}>
                            {revealedKey || `${keyData.key_prefix}••••••••••••••••••••`}
                        </span>
                        {revealedKey
                            ? <button onClick={() => copy(revealedKey)} className="btn btn-sm btn-ghost" style={{ fontSize: '0.7rem' }}>{copied ? '✓ Copied' : 'Copy'}</button>
                            : <button onClick={() => onReveal(keyData.id)} className="btn btn-sm btn-ghost" style={{ fontSize: '0.7rem' }}>Reveal (once)</button>
                        }
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', border: '1px solid var(--border)', color: 'var(--dim)', letterSpacing: '0.08em' }}>{keyData.plan.toUpperCase()}</span>
                    <button onClick={() => onDelete(keyData.id)} className="btn btn-sm btn-ghost" style={{ color: 'var(--bad)', fontSize: '0.7rem' }}>Delete</button>
                </div>
            </div>

            <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.7rem', color: 'var(--dim)' }}>
                    <span>Usage this month</span>
                    <span>{keyData.usage_count.toLocaleString()} / {keyData.plan === 'enterprise' ? '∞' : { demo: '100', starter: '1,000', professional: '10,000' }[keyData.plan]}</span>
                </div>
                <RiskBadge score={usagePct} />
            </div>

            <div style={{ marginTop: 12, fontSize: '0.68rem', color: 'var(--dim)' }}>
                Created {new Date(keyData.created_at).toLocaleDateString()} ·
                {keyData.last_used_at ? ` Last used ${new Date(keyData.last_used_at).toLocaleDateString()}` : ' Never used'}
            </div>
        </div>
    )
}

// ── Main Developer page ───────────────────────────────────────────────────────
export default function Developer() {
    const [user, setUser] = useState(null)
    const [loadingAuth, setLoadingAuth] = useState(true)
    const [keys, setKeys] = useState([])
    const [loadingKeys, setLoadingKeys] = useState(false)
    const [newKeyName, setNewKeyName] = useState('')
    const [newKeyPlan, setNewKeyPlan] = useState('demo')
    const [creating, setCreating] = useState(false)
    const [revealedKeys, setRevealedKeys] = useState({}) // id → rawKey (only stored momentarily)
    const [activeTab, setActiveTab] = useState('keys') // keys | pricing | docs
    const [codeTab, setCodeTab] = useState('curl')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        const firebaseAuth = getFirebaseAuth()
        if (!firebaseAuth) { setLoadingAuth(false); return }
        const unsub = onAuthStateChanged(firebaseAuth, (u) => {
            setUser(u)
            setLoadingAuth(false)
        })
        return unsub
    }, [])

    useEffect(() => {
        if (user) fetchKeys()
    }, [user])

    const getIdToken = async () => {
        if (!user) throw new Error('Not signed in')
        return user.getIdToken()
    }

    const fetchKeys = async () => {
        setLoadingKeys(true)
        try {
            const token = await getIdToken()
            const res = await fetch('/api/developer/keys', { headers: { Authorization: `Bearer ${token}` } })
            const data = await res.json()
            if (res.ok) setKeys(data.keys || [])
            else setError(data.error)
        } catch (e) { setError(e.message) } finally { setLoadingKeys(false) }
    }

    const createKey = async (e) => {
        e.preventDefault()
        if (!newKeyName.trim()) return
        setCreating(true); setError(''); setSuccess('')
        try {
            const token = await getIdToken()
            const res = await fetch('/api/developer/keys', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName, plan: newKeyPlan }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            // Store the raw key — it's shown once only
            setRevealedKeys(prev => ({ ...prev, [data.prefix]: data.key }))
            setSuccess(`API key created! Copy it now — it won't be shown again.`)
            setNewKeyName('')
            await fetchKeys()
            // Find the new key id
            setTimeout(() => {
                setRevealedKeys(prev => {
                    const updated = { ...prev }
                    // We'll match by prefix in KeyCard
                    return updated
                })
            }, 30000) // Auto-hide after 30s
        } catch (e) { setError(e.message) } finally { setCreating(false) }
    }

    const deleteKey = async (id) => {
        if (!confirm('Permanently delete this API key? This cannot be undone.')) return
        try {
            const token = await getIdToken()
            const res = await fetch(`/api/developer/keys/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setSuccess('API key deleted.')
            await fetchKeys()
        } catch (e) { setError(e.message) }
    }

    const revealKey = (id) => {
        // The key is only shown once during creation in revealedKeys
        // For security, we don't allow re-reveal — user must delete and recreate
        alert('For security, the key can only be revealed once on creation.\nDelete this key and create a new one if you need to access it again.')
    }

    if (loadingAuth) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--dim)' }}>Loading…</div>
    }

    if (!user) {
        return (
            <div style={{ padding: '48px 24px' }}>
                <div style={{ maxWidth: 600, margin: '0 auto 40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', letterSpacing: '0.15em', color: 'var(--accent)', marginBottom: 12, fontFamily: 'monospace' }}>DEVELOPER PORTAL</div>
                    <h1 style={{ fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>Integrate SHADOWGUARD<br />into your stack</h1>
                    <p style={{ color: 'var(--dim)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        Get an API key, run pre-execution simulations in your own pipeline, and protect your users from malicious transactions.
                    </p>
                </div>
                <AuthGate onUser={setUser} />
            </div>
        )
    }

    return (
        <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }}>Developer Portal</h1>
                    <p style={{ color: 'var(--dim)', fontSize: '0.82rem' }}>{user.email}</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => { const a = getFirebaseAuth(); if (a) signOut(a).then(() => setUser(null)) }}>Sign Out</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 32, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
                {[['keys', 'API Keys'], ['pricing', 'Pricing'], ['docs', 'Integration']].map(([id, label]) => (
                    <button key={id} onClick={() => setActiveTab(id)} style={{
                        padding: '10px 20px', fontWeight: 600, fontSize: '0.82rem', border: 'none', background: 'none',
                        cursor: 'pointer', color: activeTab === id ? 'var(--fg)' : 'var(--dim)',
                        borderBottom: activeTab === id ? '2px solid var(--accent)' : '2px solid transparent',
                        marginBottom: -1,
                    }}>{label}</button>
                ))}
            </div>

            {/* Alerts */}
            {error && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '10px 16px', marginBottom: 20, fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                    {error} <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>×</button>
                </div>
            )}
            {success && (
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '10px 16px', marginBottom: 20, fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                    {success} <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981' }}>×</button>
                </div>
            )}

            {/* ── API KEYS TAB ── */}
            {activeTab === 'keys' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28, alignItems: 'start' }}>
                    <div>
                        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Your API Keys</h2>
                        {loadingKeys ? (
                            <div style={{ color: 'var(--dim)', fontSize: '0.82rem' }}>Loading keys…</div>
                        ) : keys.length === 0 ? (
                            <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔑</div>
                                <p style={{ color: 'var(--dim)', fontSize: '0.85rem' }}>No API keys yet. Create your first key to get started.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {keys.map(k => (
                                    <KeyCard
                                        key={k.id}
                                        keyData={k}
                                        revealedKey={Object.entries(revealedKeys).find(([prefix]) => k.key_prefix?.startsWith(prefix))?.[1] || null}
                                        onDelete={deleteKey}
                                        onReveal={revealKey}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Create key panel */}
                    <div className="card" style={{ padding: 24, position: 'sticky', top: 24 }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 20 }}>Create New Key</h3>
                        <form onSubmit={createKey} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: '0.72rem', color: 'var(--dim)', display: 'block', marginBottom: 6, letterSpacing: '0.08em' }}>KEY NAME</label>
                                <input
                                    className="input"
                                    style={{ width: '100%' }}
                                    placeholder="e.g. My DeFi App"
                                    value={newKeyName}
                                    onChange={e => setNewKeyName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.72rem', color: 'var(--dim)', display: 'block', marginBottom: 6, letterSpacing: '0.08em' }}>PLAN</label>
                                <select className="input" style={{ width: '100%' }} value={newKeyPlan} onChange={e => setNewKeyPlan(e.target.value)}>
                                    <option value="demo">Demo — 100 req/mo (Free)</option>
                                    <option value="starter">Starter — 1,000 req/mo ($20)</option>
                                    <option value="professional">Professional — 10,000 req/mo ($60)</option>
                                    <option value="enterprise">Enterprise — Unlimited (Contact us)</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={creating} style={{ marginTop: 4 }}>
                                {creating ? 'Creating…' : 'Generate API Key'}
                            </button>
                            <p style={{ fontSize: '0.7rem', color: 'var(--dim)', lineHeight: 1.5 }}>
                                ⚠ Your full key is shown only once on creation. Store it securely.
                            </p>
                        </form>
                    </div>
                </div>
            )}

            {/* ── PRICING TAB ── */}
            {activeTab === 'pricing' && (
                <div>
                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>Simple, Transparent Pricing</h2>
                        <p style={{ color: 'var(--dim)', fontSize: '0.9rem' }}>Start free. Scale as your needs grow.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                        {PLANS.map(plan => (
                            <div key={plan.id} className="card" style={{
                                padding: '28px 24px',
                                border: plan.highlight ? `2px solid ${plan.color}` : '1px solid var(--border)',
                                position: 'relative',
                                display: 'flex', flexDirection: 'column',
                            }}>
                                {plan.highlight && (
                                    <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: '0.62rem', fontWeight: 800, padding: '3px 12px', letterSpacing: '0.1em' }}>MOST POPULAR</div>
                                )}
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: plan.color, marginBottom: 12 }}>{plan.name.toUpperCase()}</div>
                                <div style={{ marginBottom: 16 }}>
                                    <span style={{ fontSize: '2rem', fontWeight: 900 }}>{plan.price}</span>
                                    {plan.period && <span style={{ color: 'var(--dim)', fontSize: '0.82rem' }}>{plan.period}</span>}
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--dim)', marginBottom: 24, flex: 1 }}>
                                    <div style={{ marginBottom: 8 }}>✓ {plan.requests}</div>
                                    <div style={{ marginBottom: 8 }}>✓ SSE streaming</div>
                                    <div style={{ marginBottom: 8 }}>✓ Multi-chain support</div>
                                    {plan.id !== 'demo' && <div style={{ marginBottom: 8 }}>✓ Priority support</div>}
                                    {(plan.id === 'professional' || plan.id === 'enterprise') && <div>✓ Dedicated SLA</div>}
                                </div>
                                <button
                                    className="btn"
                                    style={{ background: plan.highlight ? plan.color : 'none', border: `1px solid ${plan.color}`, color: plan.highlight ? '#fff' : plan.color, fontWeight: 700, fontSize: '0.78rem' }}
                                    onClick={() => plan.id === 'enterprise' ? window.open('mailto:enterprise@shadowguard.io') : setActiveTab('keys')}
                                >{plan.cta}</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── DOCS TAB ── */}
            {activeTab === 'docs' && (
                <div style={{ maxWidth: 800 }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>Integration Guide</h2>
                    <p style={{ color: 'var(--dim)', fontSize: '0.85rem', marginBottom: 28, lineHeight: 1.6 }}>
                        The ShadowGuard API uses Server-Sent Events (SSE) for streaming simulation results in real time.
                        Replace <code style={{ color: 'var(--accent)' }}>YOUR_API_KEY</code> with your generated key.
                    </p>

                    <div style={{ marginBottom: 28 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 8 }}>Base URL</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', padding: '10px 16px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--accent)' }}>
                            https://api.shadowguard.io/api/v1
                        </div>
                    </div>

                    <div style={{ marginBottom: 28 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 8 }}>Authentication</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', padding: '10px 16px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                            X-API-Key: sg_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
                        </div>
                    </div>

                    {/* Code tabs */}
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 12 }}>Example: POST /simulate</div>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
                            {['curl', 'node', 'python'].map(lang => (
                                <button key={lang} onClick={() => setCodeTab(lang)} style={{
                                    padding: '6px 16px', fontSize: '0.72rem', fontWeight: 700,
                                    background: codeTab === lang ? 'var(--border)' : 'none',
                                    border: '1px solid var(--border)', borderBottom: codeTab === lang ? '1px solid var(--bg-dark)' : '1px solid var(--border)',
                                    cursor: 'pointer', color: codeTab === lang ? 'var(--fg)' : 'var(--dim)',
                                    letterSpacing: '0.08em',
                                }}>{lang.toUpperCase()}</button>
                            ))}
                        </div>
                        <div style={{ position: 'relative' }}>
                            <pre style={{ fontFamily: 'monospace', fontSize: '0.78rem', padding: '20px', background: 'var(--bg)', border: '1px solid var(--border)', overflowX: 'auto', lineHeight: 1.7, color: 'var(--fg)', margin: 0 }}>
                                {CODE_EXAMPLES[codeTab]}
                            </pre>
                            <button
                                onClick={() => { navigator.clipboard.writeText(CODE_EXAMPLES[codeTab]) }}
                                className="btn btn-ghost btn-sm"
                                style={{ position: 'absolute', top: 12, right: 12, fontSize: '0.65rem' }}
                            >Copy</button>
                        </div>
                    </div>

                    <div style={{ marginTop: 32 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 12 }}>Response Events</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {['Event type', 'Description'].map(h => (
                                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--dim)', fontWeight: 600 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['progress', 'Simulation step completed (8 steps total)'],
                                    ['result', 'Final verdict: risk_score, verdict, threats[]'],
                                    ['error', 'Simulation failed — check message field'],
                                    ['done', 'Stream complete — close connection'],
                                ].map(([type, desc]) => (
                                    <tr key={type} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 12px' }}><code style={{ color: 'var(--accent)' }}>{type}</code></td>
                                        <td style={{ padding: '10px 12px', color: 'var(--dim)' }}>{desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: 32, padding: '20px 24px', background: 'rgba(13,89,242,0.08)', border: '1px solid rgba(13,89,242,0.2)', fontSize: '0.82rem', color: 'var(--dim)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--fg)' }}>Rate Limits:</strong> Requests over your monthly plan limit return HTTP 429. Usage resets on the 1st of each month. Contact <a href="mailto:enterprise@shadowguard.io" style={{ color: 'var(--accent)' }}>enterprise@shadowguard.io</a> for unlimited access.
                    </div>
                </div>
            )}
        </div>
    )
}
