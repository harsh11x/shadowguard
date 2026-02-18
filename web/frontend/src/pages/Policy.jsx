import { useState, useEffect } from 'react'

const PRESETS = {
    strict: { max_drain: 10, disallow_selfdestruct: true, disallow_delegatecall: true, max_nested_calls: 2, min_risk_score: 0 },
    default: { max_drain: 50, disallow_selfdestruct: false, disallow_delegatecall: false, max_nested_calls: 5, min_risk_score: 0 },
    permissive: { max_drain: 90, disallow_selfdestruct: false, disallow_delegatecall: false, max_nested_calls: 15, min_risk_score: 0 },
    defi_safe: { max_drain: 30, disallow_selfdestruct: true, disallow_delegatecall: false, max_nested_calls: 8, min_risk_score: 0 },
}

const PRESET_LABELS = {
    strict: { label: 'Strict', desc: 'Maximum security — blocks most DeFi interactions', color: 'var(--red)' },
    default: { label: 'Default', desc: 'Balanced — suitable for most use cases', color: 'var(--yellow)' },
    permissive: { label: 'Permissive', desc: 'Minimal restrictions — monitoring only', color: 'var(--green)' },
    defi_safe: { label: 'DeFi Safe', desc: 'Optimized for DeFi — allows proxies, blocks self-destruct', color: 'var(--yellow)' },
}

export default function Policy() {
    const [policy, setPolicy] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState(null)
    const [local, setLocal] = useState({})
    const [allowlist, setAllowlist] = useState(() => {
        try { return JSON.parse(localStorage.getItem('sg_allowlist') || '[]') } catch { return [] }
    })
    const [blocklist, setBlocklist] = useState(() => {
        try { return JSON.parse(localStorage.getItem('sg_blocklist') || '[]') } catch { return [] }
    })
    const [newAllow, setNewAllow] = useState('')
    const [newBlock, setNewBlock] = useState('')

    useEffect(() => {
        fetch('/api/policy')
            .then(r => r.json())
            .then(d => { setPolicy(d); setLocal(d); setLoading(false) })
            .catch(e => { setError(e.message); setLoading(false) })
    }, [])

    const save = async () => {
        setSaving(true); setSaved(false); setError(null)
        try {
            const res = await fetch('/api/policy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(local),
            })
            const d = await res.json()
            if (!res.ok) throw new Error(d.error)
            setPolicy(d.policy); setLocal(d.policy)
            setSaved(true); setTimeout(() => setSaved(false), 3000)
        } catch (e) { setError(e.message) } finally { setSaving(false) }
    }

    const applyPreset = (key) => {
        setLocal(l => ({ ...l, ...PRESETS[key] }))
    }

    const addToList = (type) => {
        const addr = type === 'allow' ? newAllow.trim() : newBlock.trim()
        if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) return
        if (type === 'allow') {
            const updated = [...new Set([...allowlist, addr])]
            setAllowlist(updated); localStorage.setItem('sg_allowlist', JSON.stringify(updated)); setNewAllow('')
        } else {
            const updated = [...new Set([...blocklist, addr])]
            setBlocklist(updated); localStorage.setItem('sg_blocklist', JSON.stringify(updated)); setNewBlock('')
        }
    }

    const removeFromList = (type, addr) => {
        if (type === 'allow') {
            const updated = allowlist.filter(a => a !== addr)
            setAllowlist(updated); localStorage.setItem('sg_allowlist', JSON.stringify(updated))
        } else {
            const updated = blocklist.filter(a => a !== addr)
            setBlocklist(updated); localStorage.setItem('sg_blocklist', JSON.stringify(updated))
        }
    }

    if (loading) return <div className="page"><div style={{ padding: 32, color: 'var(--dim)' }}><span className="spinner" /> Loading policy…</div></div>

    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div className="page-title">Security Policy</div>
                        <div className="page-subtitle">Configure risk thresholds — applied to every simulation in real-time</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {saved && <span className="good" style={{ fontSize: '0.8rem' }}>✓ Saved</span>}
                        <button className="btn btn-ghost btn-sm" onClick={() => setLocal({ ...policy })}>↺ Reset</button>
                        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                            {saving ? <><span className="spinner" /> Saving…</> : '✓ Save Policy'}
                        </button>
                    </div>
                </div>
            </div>

            {error && <div style={{ padding: '12px 16px', border: '2px solid var(--red)', color: 'var(--red)', marginBottom: 16, fontSize: '0.82rem' }}>✗ {error}</div>}

            {/* Policy Presets */}
            <div className="panel" style={{ marginBottom: 16 }}>
                <div className="panel-header"><span className="panel-title">Quick Presets</span></div>
                <div className="panel-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                        {Object.entries(PRESET_LABELS).map(([key, { label, desc, color }]) => (
                            <div key={key}
                                style={{ padding: '12px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.2s' }}
                                onClick={() => applyPreset(key)}
                                onMouseEnter={e => e.currentTarget.style.borderColor = color}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                            >
                                <div style={{ fontWeight: 700, color, marginBottom: 4, fontSize: '0.85rem' }}>{label}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>{desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--dim)', marginBottom: 12 }}>
                    Policy v{local.policy_version || 1} — Changes take effect on next simulation
                </div>

                {/* Max Drain */}
                <div className="panel" style={{ marginBottom: 12 }}>
                    <div className="panel-header">
                        <span className="panel-title">Balance Drain Limit</span>
                        <span style={{ color: 'var(--yellow)', fontWeight: 700, fontSize: '1.2rem' }}>{local.max_drain}%</span>
                    </div>
                    <div className="panel-body">
                        <div style={{ fontSize: '0.78rem', color: 'var(--dim)', marginBottom: 12 }}>
                            Block transactions that would drain more than this percentage of the sender's balance.
                        </div>
                        <input type="range" min="1" max="100" step="1" value={local.max_drain || 50}
                            onChange={e => setLocal(l => ({ ...l, max_drain: Number(e.target.value) }))} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--dim)', marginTop: 4 }}>
                            <span>1% (strict)</span><span>50% (default)</span><span>100% (off)</span>
                        </div>
                    </div>
                </div>

                {/* Max Nested Calls */}
                <div className="panel" style={{ marginBottom: 12 }}>
                    <div className="panel-header">
                        <span className="panel-title">Max Nested Call Depth</span>
                        <span style={{ color: 'var(--yellow)', fontWeight: 700, fontSize: '1.2rem' }}>{local.max_nested_calls}</span>
                    </div>
                    <div className="panel-body">
                        <div style={{ fontSize: '0.78rem', color: 'var(--dim)', marginBottom: 12 }}>
                            Flag transactions with more than this many nested external calls (reentrancy risk indicator).
                        </div>
                        <input type="range" min="1" max="20" step="1" value={local.max_nested_calls || 5}
                            onChange={e => setLocal(l => ({ ...l, max_nested_calls: Number(e.target.value) }))} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--dim)', marginTop: 4 }}>
                            <span>1 (strict)</span><span>5 (default)</span><span>20 (permissive)</span>
                        </div>
                    </div>
                </div>

                {/* Toggles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {[
                        { key: 'disallow_selfdestruct', label: 'Block SELFDESTRUCT', sub: 'Reject any transaction targeting a contract with SELFDESTRUCT opcode' },
                        { key: 'disallow_delegatecall', label: 'Block DELEGATECALL', sub: 'Reject transactions to contracts using DELEGATECALL (proxy risk)' },
                    ].map(({ key, label, sub }) => (
                        <div key={key} className="toggle-row">
                            <div>
                                <div className="toggle-label">{label}</div>
                                <div className="toggle-sub">{sub}</div>
                            </div>
                            <button className={`toggle ${local[key] ? 'on' : ''}`}
                                onClick={() => setLocal(l => ({ ...l, [key]: !l[key] }))} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Allowlist / Blocklist */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Allowlist */}
                <div className="panel">
                    <div className="panel-header">
                        <span className="panel-title">✓ Allowlist</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--green)' }}>{allowlist.length} addresses</span>
                    </div>
                    <div className="panel-body">
                        <div style={{ fontSize: '0.72rem', color: 'var(--dim)', marginBottom: 10 }}>Always allow simulations to these addresses</div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                            <input value={newAllow} onChange={e => setNewAllow(e.target.value)} placeholder="0x..." spellCheck={false} style={{ flex: 1, fontSize: '0.72rem' }} onKeyDown={e => e.key === 'Enter' && addToList('allow')} />
                            <button className="btn btn-ghost btn-sm" onClick={() => addToList('allow')}>+ Add</button>
                        </div>
                        {allowlist.map(addr => (
                            <div key={addr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                                <span className="mono good" style={{ fontSize: '0.68rem' }}>{addr.slice(0, 14)}…{addr.slice(-6)}</span>
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.6rem', padding: '1px 6px', color: 'var(--red)' }} onClick={() => removeFromList('allow', addr)}>✕</button>
                            </div>
                        ))}
                        {allowlist.length === 0 && <div className="dim" style={{ fontSize: '0.72rem' }}>No addresses</div>}
                    </div>
                </div>

                {/* Blocklist */}
                <div className="panel">
                    <div className="panel-header">
                        <span className="panel-title">⛔ Blocklist</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--red)' }}>{blocklist.length} addresses</span>
                    </div>
                    <div className="panel-body">
                        <div style={{ fontSize: '0.72rem', color: 'var(--dim)', marginBottom: 10 }}>Always block simulations to these addresses</div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                            <input value={newBlock} onChange={e => setNewBlock(e.target.value)} placeholder="0x..." spellCheck={false} style={{ flex: 1, fontSize: '0.72rem' }} onKeyDown={e => e.key === 'Enter' && addToList('block')} />
                            <button className="btn btn-ghost btn-sm" onClick={() => addToList('block')}>+ Add</button>
                        </div>
                        {blocklist.map(addr => (
                            <div key={addr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                                <span className="mono bad" style={{ fontSize: '0.68rem' }}>{addr.slice(0, 14)}…{addr.slice(-6)}</span>
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.6rem', padding: '1px 6px', color: 'var(--red)' }} onClick={() => removeFromList('block', addr)}>✕</button>
                            </div>
                        ))}
                        {blocklist.length === 0 && <div className="dim" style={{ fontSize: '0.72rem' }}>No addresses</div>}
                    </div>
                </div>
            </div>

            {/* Raw JSON */}
            <div className="panel">
                <div className="panel-header"><span className="panel-title">Raw Policy (JSON)</span></div>
                <div className="panel-body">
                    <pre style={{ fontSize: '0.78rem', color: 'var(--dim)', overflowX: 'auto' }}>{JSON.stringify(local, null, 2)}</pre>
                </div>
            </div>
        </div>
    )
}
