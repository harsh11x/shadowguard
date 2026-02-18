import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const LEVEL_TAG = { LOW: 'tag-green', MEDIUM: 'tag-yellow', HIGH: 'tag-orange', CRITICAL: 'tag-red' }
const LEVELS = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function History() {
    const navigate = useNavigate()
    const [records, setRecords] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selected, setSelected] = useState(null)
    const [search, setSearch] = useState('')
    const [levelFilter, setLevelFilter] = useState('ALL')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const PAGE_SIZE = 20

    const load = (p = page) => {
        setLoading(true)
        const params = new URLSearchParams({
            limit: '500',
            page: String(p),
            page_size: String(PAGE_SIZE),
            ...(search && { search }),
            ...(levelFilter !== 'ALL' && { level: levelFilter }),
        })
        fetch(`/api/history?${params}`)
            .then(r => r.json())
            .then(d => {
                setRecords(d.records || [])
                setTotal(d.total || 0)
                setTotalPages(d.total_pages || 1)
                setLoading(false)
            })
            .catch(e => { setError(e.message); setLoading(false) })
    }

    useEffect(() => { setPage(1); load(1) }, [search, levelFilter])
    useEffect(() => { load(page) }, [page])

    const fmt = (ts) => { try { return new Date(ts).toLocaleString() } catch { return ts } }
    const truncate = (s, n = 14) => s ? `${s.slice(0, n)}…` : '—'

    const exportCSV = () => { window.open('/api/export?format=csv', '_blank') }
    const exportJSON = () => { window.open('/api/export?format=json', '_blank') }

    const replayRecord = (r) => {
        const req = r.request || {}
        const params = new URLSearchParams({
            from: req.sender || '',
            to: req.to || '',
            value: ((req.value_wei || 0) / 1e18).toString(),
            data: req.data || '0x',
        })
        navigate(`/?${params}`)
    }

    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div className="page-title">Simulation History</div>
                        <div className="page-subtitle">All past simulations stored in SQLite — {total} records</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={exportCSV}>↓ CSV</button>
                        <button className="btn btn-ghost btn-sm" onClick={exportJSON}>↓ JSON</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => load()}>↻ Refresh</button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by address, sim ID…"
                    style={{ flex: 1, minWidth: 200 }}
                />
                <div style={{ display: 'flex', gap: 4 }}>
                    {LEVELS.map(l => (
                        <button key={l}
                            className={`btn btn-ghost btn-sm ${levelFilter === l ? 'active' : ''}`}
                            style={{ fontSize: '0.68rem', padding: '4px 10px', borderColor: levelFilter === l ? 'var(--yellow)' : 'var(--border)', color: levelFilter === l ? 'var(--yellow)' : 'var(--dim)' }}
                            onClick={() => setLevelFilter(l)}
                        >{l}</button>
                    ))}
                </div>
            </div>

            {loading && <div style={{ padding: 32, textAlign: 'center', color: 'var(--dim)' }}><span className="spinner" /> Loading…</div>}
            {error && <div style={{ padding: '12px 16px', border: '2px solid var(--red)', color: 'var(--red)', marginBottom: 16 }}>✗ {error}</div>}

            {!loading && records.length === 0 && (
                <div className="empty-state">
                    <h3>{search || levelFilter !== 'ALL' ? 'No matching records' : 'No simulations yet'}</h3>
                    <p>{search || levelFilter !== 'ALL' ? 'Try adjusting your filters.' : 'Run a simulation from the Simulate page.'}</p>
                </div>
            )}

            {records.length > 0 && (
                <div className="panel">
                    <div className="panel-header">
                        <span className="panel-title">Simulation Log</span>
                        <span className="dim" style={{ fontSize: '0.72rem' }}>Page {page} of {totalPages}</span>
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
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r, i) => {
                                const req = r.request || {}
                                const risk = r.risk_report || {}
                                const level = risk.level || 'LOW'
                                return (
                                    <>
                                        <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setSelected(selected === i ? null : i)}>
                                            <td><span className="mono" style={{ fontSize: '0.75rem', color: 'var(--yellow)' }}>{r.simulation_id}</span></td>
                                            <td style={{ color: 'var(--dim)', fontSize: '0.75rem' }}>{fmt(r.timestamp)}</td>
                                            <td><span className="mono dim" style={{ fontSize: '0.72rem' }}>{truncate(req.sender, 10)}</span></td>
                                            <td><span className="mono" style={{ fontSize: '0.72rem' }}>{truncate(req.to, 10)}</span></td>
                                            <td>{((req.value_wei || 0) / 1e18).toFixed(4)} ETH</td>
                                            <td><strong style={{ color: risk.score > 60 ? 'var(--red)' : risk.score > 30 ? 'var(--orange)' : 'var(--green)' }}>{risk.score ?? '—'}</strong></td>
                                            <td><span className={`tag ${LEVEL_TAG[level] || 'tag-green'}`}>{level}</span></td>
                                            <td style={{ color: 'var(--dim)', fontSize: '0.75rem' }}>{r.execution_time_s?.toFixed(2)}s</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.6rem', padding: '2px 6px' }}
                                                        onClick={() => replayRecord(r)} title="Replay this simulation">▶ Replay</button>
                                                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.6rem', padding: '2px 6px' }}
                                                        onClick={() => navigate(`/inspector?addr=${req.to}`)} title="Inspect contract">⬡</button>
                                                </div>
                                            </td>
                                        </tr>
                                        {selected === i && (
                                            <tr key={`detail-${i}`}>
                                                <td colSpan={9} style={{ padding: 0 }}>
                                                    <div style={{ padding: '12px 16px', background: 'var(--panel)', borderTop: '1px solid var(--border)' }}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                                            <div>
                                                                <div style={{ fontSize: '0.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Risk Report</div>
                                                                {Object.entries(r.risk_report || {}).map(([k, v]) => (
                                                                    <div key={k} className="step-kv" style={{ marginBottom: 3 }}>
                                                                        <span className="step-kv-key">{k.replace(/_/g, ' ')}</span>
                                                                        <span className="step-kv-val" style={{ fontSize: '0.7rem' }}>{Array.isArray(v) ? v.join('; ') || 'None' : String(v)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '0.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Execution Result</div>
                                                                {Object.entries(r.execution_result || {}).slice(0, 8).map(([k, v]) => (
                                                                    <div key={k} className="step-kv" style={{ marginBottom: 3 }}>
                                                                        <span className="step-kv-key">{k.replace(/_/g, ' ')}</span>
                                                                        <span className="step-kv-val" style={{ fontSize: '0.7rem' }}>{typeof v === 'boolean' ? (v ? 'YES' : 'NO') : String(v)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '0.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>State Diff</div>
                                                                {Object.entries(r.state_diff || {}).slice(0, 6).map(([k, v]) => (
                                                                    <div key={k} className="step-kv" style={{ marginBottom: 3 }}>
                                                                        <span className="step-kv-key">{k.replace(/_/g, ' ')}</span>
                                                                        <span className="step-kv-val" style={{ fontSize: '0.7rem' }}>{typeof v === 'object' ? JSON.stringify(v).slice(0, 40) : String(v)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )
                            })}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                                <button key={p} className={`btn btn-ghost btn-sm ${page === p ? 'active' : ''}`}
                                    style={{ borderColor: page === p ? 'var(--yellow)' : 'var(--border)', color: page === p ? 'var(--yellow)' : 'var(--dim)' }}
                                    onClick={() => setPage(p)}>{p}</button>
                            ))}
                            <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
