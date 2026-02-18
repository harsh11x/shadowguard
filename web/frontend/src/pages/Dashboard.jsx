import { useState, useEffect, useRef } from 'react'

const LEVEL_COLOR = { LOW: 'var(--green)', MEDIUM: 'var(--yellow)', HIGH: 'var(--orange)', CRITICAL: 'var(--red)' }
const LEVEL_TAG = { LOW: 'tag-green', MEDIUM: 'tag-yellow', HIGH: 'tag-orange', CRITICAL: 'tag-red' }

function StatCard({ label, value, sub, accent }) {
    return (
        <div className="stat-card" style={{ borderColor: accent || 'var(--border)' }}>
            <div className="stat-value" style={{ color: accent || 'var(--yellow)' }}>{value ?? '—'}</div>
            <div className="stat-label">{label}</div>
            {sub && <div className="stat-sub">{sub}</div>}
        </div>
    )
}

function MiniBar({ label, count, total, color }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                <span style={{ color: color || 'var(--dim)' }}>{label}</span>
                <span style={{ color: 'var(--white)' }}>{count} <span className="dim">({pct}%)</span></span>
            </div>
            <div className="risk-bar-track" style={{ height: 6 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color || 'var(--yellow)', transition: 'width 0.6s ease' }} />
            </div>
        </div>
    )
}

function ActivityChart({ data }) {
    const max = Math.max(...data.map(d => d.count), 1)
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60, marginTop: 8 }}>
            {data.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                        width: '100%',
                        height: `${Math.max((d.count / max) * 52, d.count > 0 ? 4 : 0)}px`,
                        background: d.count > 0 ? 'var(--yellow)' : 'var(--border)',
                        transition: 'height 0.4s ease',
                        opacity: d.count > 0 ? 1 : 0.3,
                    }} title={`${d.date}: ${d.count} simulations`} />
                    <span style={{ fontSize: '0.55rem', color: 'var(--dim)' }}>{d.date.slice(5)}</span>
                </div>
            ))}
        </div>
    )
}

export default function Dashboard() {
    const [stats, setStats] = useState(null)
    const [net, setNet] = useState(null)
    const [loading, setLoading] = useState(true)
    const [blockHistory, setBlockHistory] = useState([])
    const intervalRef = useRef(null)

    const loadStats = () => {
        fetch('/api/stats').then(r => r.json()).then(d => { setStats(d); setLoading(false) }).catch(() => setLoading(false))
    }

    const loadNet = () => {
        fetch('/api/network').then(r => r.json()).then(d => {
            setNet(d)
            setBlockHistory(prev => {
                const next = [...prev, { block: d.block, gas: d.gas_price_gwei, time: new Date().toLocaleTimeString() }]
                return next.slice(-12)
            })
        }).catch(() => { })
    }

    useEffect(() => {
        loadStats()
        loadNet()
        intervalRef.current = setInterval(() => { loadNet() }, 12000)
        return () => clearInterval(intervalRef.current)
    }, [])

    const dist = stats?.distribution || {}
    const total = stats?.total || 0

    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div className="page-title">Dashboard</div>
                        <div className="page-subtitle">Live analytics — Ethereum Mainnet</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => { loadStats(); loadNet() }}>↻ Refresh</button>
                </div>
            </div>

            {/* Live Network Status */}
            <div className="panel" style={{ marginBottom: 20 }}>
                <div className="panel-header">
                    <span className="panel-title">⬡ Live Network — Ethereum Mainnet</span>

                    <span style={{ fontSize: '0.68rem', color: 'var(--green)' }}>● LIVE</span>
                </div>
                <div className="panel-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                        {[
                            { label: 'Block Number', value: net?.block?.toLocaleString() ?? '…', accent: 'var(--yellow)' },
                            { label: 'Gas Price', value: net?.gas_price_gwei ? `${net.gas_price_gwei.toFixed(3)} Gwei` : '…', accent: 'var(--green)' },
                            { label: 'Base Fee', value: net?.base_fee_gwei ? `${net.base_fee_gwei.toFixed(3)} Gwei` : '…', accent: 'var(--dim)' },
                            { label: 'Chain ID', value: net?.chain_id ?? '…', accent: 'var(--dim)' },
                        ].map(c => (
                            <div key={c.label} style={{ textAlign: 'center', padding: '12px 0' }}>
                                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: c.accent, fontFamily: 'monospace' }}>{c.value}</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{c.label}</div>
                            </div>
                        ))}
                    </div>
                    {blockHistory.length > 1 && (
                        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--dim)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Gas Price History (last {blockHistory.length} polls)</div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 32 }}>
                                {blockHistory.map((b, i) => {
                                    const maxG = Math.max(...blockHistory.map(x => x.gas || 0), 0.001)
                                    const h = Math.max(((b.gas || 0) / maxG) * 28, 2)
                                    return (
                                        <div key={i} style={{ flex: 1, height: `${h}px`, background: 'var(--yellow)', opacity: 0.4 + (i / blockHistory.length) * 0.6 }}
                                            title={`${b.time}: ${b.gas?.toFixed(3)} Gwei`} />
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            {loading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--dim)' }}><span className="spinner" /> Loading analytics…</div>
            ) : (
                <>
                    <div className="stats-grid" style={{ marginBottom: 20 }}>
                        <StatCard label="Total Simulations" value={total} sub="all time" accent="var(--yellow)" />
                        <StatCard label="Avg Risk Score" value={stats?.avg_score} sub="/ 100" accent={stats?.avg_score > 60 ? 'var(--red)' : stats?.avg_score > 30 ? 'var(--orange)' : 'var(--green)'} />
                        <StatCard label="Blocked" value={stats?.blocked} sub="policy violations" accent="var(--red)" />
                        <StatCard label="Critical" value={dist.CRITICAL || 0} sub="risk level" accent="var(--red)" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                        {/* Risk Distribution */}
                        <div className="panel">
                            <div className="panel-header"><span className="panel-title">Risk Distribution</span></div>
                            <div className="panel-body">
                                {total === 0 ? (
                                    <div className="dim" style={{ fontSize: '0.8rem' }}>No simulations yet</div>
                                ) : (
                                    <>
                                        <MiniBar label="LOW" count={dist.LOW || 0} total={total} color="var(--green)" />
                                        <MiniBar label="MEDIUM" count={dist.MEDIUM || 0} total={total} color="var(--yellow)" />
                                        <MiniBar label="HIGH" count={dist.HIGH || 0} total={total} color="var(--orange)" />
                                        <MiniBar label="CRITICAL" count={dist.CRITICAL || 0} total={total} color="var(--red)" />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 7-day Activity */}
                        <div className="panel">
                            <div className="panel-header"><span className="panel-title">7-Day Activity</span></div>
                            <div className="panel-body">
                                {stats?.activity_7d ? <ActivityChart data={stats.activity_7d} /> : <div className="dim" style={{ fontSize: '0.8rem' }}>No data</div>}
                                <div style={{ marginTop: 8, fontSize: '0.68rem', color: 'var(--dim)' }}>
                                    {stats?.activity_7d?.reduce((s, d) => s + d.count, 0) || 0} simulations in last 7 days
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Top Contracts */}
                        <div className="panel">
                            <div className="panel-header"><span className="panel-title">Most Targeted Contracts</span></div>
                            <div className="panel-body">
                                {(stats?.top_contracts || []).length === 0 ? (
                                    <div className="dim" style={{ fontSize: '0.8rem' }}>No data yet</div>
                                ) : (
                                    stats.top_contracts.map((c, i) => (
                                        <div key={i} className="step-kv" style={{ marginBottom: 6 }}>
                                            <span className="mono dim" style={{ fontSize: '0.7rem' }}>{c.addr.slice(0, 10)}…{c.addr.slice(-6)}</span>
                                            <span style={{ color: 'var(--yellow)', fontWeight: 700 }}>{c.count}×</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Recent Simulations */}
                        <div className="panel">
                            <div className="panel-header"><span className="panel-title">Recent Simulations</span></div>
                            <div className="panel-body">
                                {(stats?.recent || []).length === 0 ? (
                                    <div className="dim" style={{ fontSize: '0.8rem' }}>No simulations yet</div>
                                ) : (
                                    stats.recent.map((r, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < stats.recent.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                            <div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--yellow)', fontFamily: 'monospace' }}>{r.simulation_id}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--dim)' }}>{r.to?.slice(0, 10)}… · {r.execution_time_s?.toFixed(1)}s</div>
                                            </div>
                                            <span className={`tag ${LEVEL_TAG[r.level] || 'tag-green'}`} style={{ fontSize: '0.6rem' }}>{r.level}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
