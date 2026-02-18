import { useState, useEffect } from 'react'

const LEVEL_TAG = {
    LOW: 'tag-green',
    MEDIUM: 'tag-yellow',
    HIGH: 'tag-orange',
    CRITICAL: 'tag-red',
}

export default function History() {
    const [records, setRecords] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selected, setSelected] = useState(null)
    const [limit, setLimit] = useState(20)

    const load = () => {
        setLoading(true)
        fetch(`/api/history?limit=${limit}`)
            .then(r => r.json())
            .then(d => {
                setRecords(d.records || [])
                setLoading(false)
            })
            .catch(e => { setError(e.message); setLoading(false) })
    }

    useEffect(() => { load() }, [limit])

    const fmt = (ts) => {
        try { return new Date(ts).toLocaleString() } catch { return ts }
    }

    const truncate = (s, n = 16) => s ? `${s.slice(0, n)}…` : '—'

    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div className="page-title">Simulation History</div>
                        <div className="page-subtitle">All past simulations stored in SQLite — {records.length} records</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ width: 'auto', padding: '6px 12px' }}>
                            <option value={10}>10 records</option>
                            <option value={20}>20 records</option>
                            <option value={50}>50 records</option>
                        </select>
                        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
                    </div>
                </div>
            </div>

            {loading && (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--dim)' }}>
                    <span className="spinner" /> Loading…
                </div>
            )}

            {error && (
                <div style={{ padding: '12px 16px', border: '2px solid var(--red)', color: 'var(--red)', marginBottom: 16 }}>
                    ✗ {error}
                </div>
            )}

            {!loading && records.length === 0 && (
                <div className="empty-state">
                    <h3>No simulations yet</h3>
                    <p>Run a simulation from the Simulate page to see results here.</p>
                </div>
            )}

            {records.length > 0 && (
                <div className="panel">
                    <div className="panel-header">
                        <span className="panel-title">Simulation Log</span>
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Sim ID</th>
                                <th>Timestamp</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Value</th>
                                <th>Score</th>
                                <th>Level</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r, i) => {
                                const req = r.request || {}
                                const risk = r.risk_report || {}
                                const level = risk.level || 'LOW'
                                return (
                                    <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setSelected(selected === i ? null : i)}>
                                        <td><span className="mono" style={{ fontSize: '0.75rem', color: 'var(--yellow)' }}>{r.simulation_id}</span></td>
                                        <td style={{ color: 'var(--dim)', fontSize: '0.75rem' }}>{fmt(r.timestamp)}</td>
                                        <td><span className="mono dim" style={{ fontSize: '0.72rem' }}>{truncate(req.sender, 12)}</span></td>
                                        <td><span className="mono" style={{ fontSize: '0.72rem' }}>{truncate(req.to, 12)}</span></td>
                                        <td>{((req.value_wei || 0) / 1e18).toFixed(4)} ETH</td>
                                        <td><strong>{risk.score ?? '—'}</strong></td>
                                        <td><span className={`tag ${LEVEL_TAG[level] || 'tag-green'}`}>{level}</span></td>
                                        <td style={{ color: 'var(--dim)', fontSize: '0.75rem' }}>{r.execution_time_s?.toFixed(2)}s</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Detail panel */}
            {selected !== null && records[selected] && (
                <div className="panel" style={{ marginTop: 16 }}>
                    <div className="panel-header">
                        <span className="panel-title">Detail — {records[selected].simulation_id}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕ Close</button>
                    </div>
                    <div className="panel-body">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {/* Risk */}
                            <div>
                                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--dim)', marginBottom: 8 }}>Risk Report</div>
                                {Object.entries(records[selected].risk_report || {}).map(([k, v]) => (
                                    <div key={k} className="step-kv" style={{ marginBottom: 4 }}>
                                        <span className="step-kv-key">{k.replace(/_/g, ' ')}</span>
                                        <span className="step-kv-val">{Array.isArray(v) ? v.join('; ') || 'None' : String(v)}</span>
                                    </div>
                                ))}
                            </div>
                            {/* State diff */}
                            <div>
                                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--dim)', marginBottom: 8 }}>State Diff</div>
                                {Object.entries(records[selected].state_diff || {}).slice(0, 8).map(([k, v]) => (
                                    <div key={k} className="step-kv" style={{ marginBottom: 4 }}>
                                        <span className="step-kv-key">{k.replace(/_/g, ' ')}</span>
                                        <span className="step-kv-val">{typeof v === 'object' ? JSON.stringify(v).slice(0, 40) : String(v)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
