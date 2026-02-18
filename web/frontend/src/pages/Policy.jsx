import { useState, useEffect } from 'react'

export default function Policy() {
    const [policy, setPolicy] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState(null)
    const [local, setLocal] = useState({})

    useEffect(() => {
        fetch('/api/policy')
            .then(r => r.json())
            .then(d => { setPolicy(d); setLocal(d); setLoading(false) })
            .catch(e => { setError(e.message); setLoading(false) })
    }, [])

    const save = async () => {
        setSaving(true)
        setSaved(false)
        setError(null)
        try {
            const res = await fetch('/api/policy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(local),
            })
            const d = await res.json()
            if (!res.ok) throw new Error(d.error)
            setPolicy(d.policy)
            setLocal(d.policy)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (e) {
            setError(e.message)
        } finally {
            setSaving(false)
        }
    }

    const reset = () => setLocal({ ...policy })

    if (loading) return (
        <div className="page">
            <div style={{ padding: 32, color: 'var(--dim)' }}><span className="spinner" /> Loading policy…</div>
        </div>
    )

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
                        <button className="btn btn-ghost btn-sm" onClick={reset}>↺ Reset</button>
                        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                            {saving ? <><span className="spinner" /> Saving…</> : '✓ Save Policy'}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div style={{ padding: '12px 16px', border: '2px solid var(--red)', color: 'var(--red)', marginBottom: 16, fontSize: '0.82rem' }}>
                    ✗ {error}
                </div>
            )}

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
                            Currently: <strong style={{ color: 'var(--white)' }}>{local.max_drain}%</strong>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            step="1"
                            value={local.max_drain || 50}
                            onChange={e => setLocal(l => ({ ...l, max_drain: Number(e.target.value) }))}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--dim)', marginTop: 4 }}>
                            <span>1% (strict)</span>
                            <span>50% (default)</span>
                            <span>100% (off)</span>
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
                        <input
                            type="range"
                            min="1"
                            max="20"
                            step="1"
                            value={local.max_nested_calls || 5}
                            onChange={e => setLocal(l => ({ ...l, max_nested_calls: Number(e.target.value) }))}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--dim)', marginTop: 4 }}>
                            <span>1 (strict)</span>
                            <span>5 (default)</span>
                            <span>20 (permissive)</span>
                        </div>
                    </div>
                </div>

                {/* Toggles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="toggle-row">
                        <div>
                            <div className="toggle-label">Block SELFDESTRUCT</div>
                            <div className="toggle-sub">Reject any transaction targeting a contract with SELFDESTRUCT opcode</div>
                        </div>
                        <button
                            className={`toggle ${local.disallow_selfdestruct ? 'on' : ''}`}
                            onClick={() => setLocal(l => ({ ...l, disallow_selfdestruct: !l.disallow_selfdestruct }))}
                        />
                    </div>

                    <div className="toggle-row">
                        <div>
                            <div className="toggle-label">Block DELEGATECALL</div>
                            <div className="toggle-sub">Reject transactions to contracts using DELEGATECALL (proxy risk)</div>
                        </div>
                        <button
                            className={`toggle ${local.disallow_delegatecall ? 'on' : ''}`}
                            onClick={() => setLocal(l => ({ ...l, disallow_delegatecall: !l.disallow_delegatecall }))}
                        />
                    </div>
                </div>
            </div>

            {/* Current policy JSON */}
            <div className="panel">
                <div className="panel-header">
                    <span className="panel-title">Raw Policy (JSON)</span>
                </div>
                <div className="panel-body">
                    <pre style={{ fontSize: '0.78rem', color: 'var(--dim)', overflowX: 'auto' }}>
                        {JSON.stringify(local, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    )
}
