import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const NETWORKS = [
    { id: 'ethereum', label: 'Ethereum', symbol: 'ETH' },
    { id: 'polygon', label: 'Polygon', symbol: 'MATIC' },
    { id: 'bsc', label: 'BNB Chain', symbol: 'BNB' },
    { id: 'arbitrum', label: 'Arbitrum', symbol: 'ETH' },
]

const RISK_COLORS = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#eab308', LOW: '#10b981' }

function RiskBadge({ level, score }) {
    const color = RISK_COLORS[level] || '#6b7280'
    return (
        <span style={{
            fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em',
            padding: '2px 7px', background: `${color}22`, color, border: `1px solid ${color}66`,
        }}>{level}</span>
    )
}

function TransactionRow({ tx, onAnalyze }) {
    const explorerBase = {
        ethereum: 'https://etherscan.io/tx/',
        polygon: 'https://polygonscan.com/tx/',
        bsc: 'https://bscscan.com/tx/',
        arbitrum: 'https://arbiscan.io/tx/',
    }[tx.network] || 'https://etherscan.io/tx/'

    return (
        <tr className="live-tx-row" style={{ borderBottom: '1px solid var(--border)', fontSize: '0.78rem' }}>
            <td style={{ padding: '10px 8px' }}>
                <a href={`${explorerBase}${tx.hash}`} target="_blank" rel="noopener" title={tx.hash} style={{ color: 'var(--accent)', textDecoration: 'none', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                    {tx.hash.slice(0, 10)}…
                </a>
            </td>
            <td style={{ padding: '10px 8px' }}>
                <span className="addr-pill" title={tx.from}>{tx.from.slice(0, 6)}…{tx.from.slice(-4)}</span>
            </td>
            <td style={{ padding: '10px 8px' }}>
                {tx.to ? (
                    <span>
                        <span className="addr-pill" title={tx.to}>{tx.to.slice(0, 6)}…{tx.to.slice(-4)}</span>
                        {tx.known_contract && <span style={{ fontSize: '0.6rem', color: 'var(--dim)', marginLeft: 6 }}>{tx.known_contract}</span>}
                    </span>
                ) : (
                    <span className="badge-creation">DEPLOY</span>
                )}
            </td>
            <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: parseFloat(tx.value_eth) > 0 ? 'var(--fg)' : 'var(--dim)' }}>
                {parseFloat(tx.value_eth) > 0 ? `${parseFloat(tx.value_eth).toFixed(4)}` : '—'}
            </td>
            <td style={{ padding: '10px 8px' }}>
                <RiskBadge level={tx.risk_level} score={tx.risk_score} />
            </td>
            <td style={{ padding: '10px 8px', textAlign: 'right', display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button className="btn-small" onClick={() => onAnalyze(tx)} title="Run full simulation">SIMULATE</button>
            </td>
        </tr>
    )
}

export default function Live() {
    const [txs, setTxs] = useState([])
    const [isStreaming, setIsStreaming] = useState(false)
    const [status, setStatus] = useState('Connecting…')
    const [network, setNetwork] = useState('ethereum')
    const [filter, setFilter] = useState('ALL') // ALL | HIGH | CRITICAL
    const [count, setCount] = useState(0)
    const navigate = useNavigate()
    const esRef = useRef(null)

    // Scroll Anchoring Refs
    const containerRef = useRef(null)
    const prevScrollHeight = useRef(0)
    const isAtTopRef = useRef(true)

    React.useLayoutEffect(() => {
        const container = containerRef.current
        if (!container) return

        const currentScrollHeight = container.scrollHeight
        const heightDiff = currentScrollHeight - prevScrollHeight.current

        // If content was added (diff > 0) and user was NOT at top, adjust scroll to maintain position
        if (heightDiff > 0 && !isAtTopRef.current) {
            container.scrollTop += heightDiff
        }

        prevScrollHeight.current = currentScrollHeight
    }, [txs]) // Run after every txs update

    const connect = (net) => {
        if (esRef.current) { esRef.current.close(); esRef.current = null }
        setTxs([])
        setIsStreaming(false)
        setStatus(`Connecting to ${net}…`)
        setCount(0)

        const es = new EventSource(`/api/live/stream?network=${net}`)
        esRef.current = es

        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data)
                if (data.type === 'connected') {
                    setIsStreaming(true)
                    setStatus(data.message || 'Connected')
                } else if (data.type === 'tx') {
                    // Infinite Scroll: No slice
                    setTxs(prev => [data, ...prev])
                    setCount(c => c + 1)
                } else if (data.type === 'error') {
                    setStatus(`Error: ${data.message}`)
                    setIsStreaming(false)
                }
            } catch (_) { }
        }

        es.onerror = () => {
            setIsStreaming(false)
            setStatus('Connection lost — retrying…')
        }
    }

    useEffect(() => {
        connect(network)
        return () => { if (esRef.current) esRef.current.close() }
    }, [network])

    const handleAnalyze = (tx) => {
        const params = new URLSearchParams({ from: tx.from, to: tx.to || '', value: tx.value_eth || '0', data: tx.has_data ? tx.data : '0x' })
        navigate(`/?${params.toString()}`)
    }

    const filtered = filter === 'ALL' ? txs : txs.filter(t => t.risk_level === filter || (filter === 'HIGH' && ['HIGH', 'CRITICAL'].includes(t.risk_level)))

    return (
        <div className="page animate-fade-in">
            <div className="page-header">
                <div className="page-title">
                    LIVE MEMPOOL {isStreaming && <span className="pulse-red" style={{ marginLeft: 8 }}>●</span>}
                </div>
                <div className="page-subtitle">
                    Real-time pending transaction feed. Powered by direct Ethereum WebSocket connection.
                </div>
            </div>

            <div className="panel" style={{ borderTop: '4px solid var(--orange)' }}>
                <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700 }}>MEMPOOL FEED</span>
                        <span className={`status-pill ${isStreaming ? 'active' : 'offline'}`}>
                            {isStreaming ? '● LIVE' : '○ OFFLINE'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>{count} tx received</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {/* Network selector */}
                        <select
                            value={network}
                            onChange={e => setNetwork(e.target.value)}
                            className="input"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', minWidth: 140 }}
                        >
                            {NETWORKS.map(n => <option key={n.id} value={n.id}>{n.label} ({n.symbol})</option>)}
                        </select>
                        {/* Risk filter */}
                        {['ALL', 'HIGH', 'CRITICAL'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className="btn btn-sm btn-ghost"
                                style={{ fontSize: '0.68rem', fontWeight: filter === f ? 800 : 500, color: filter === f ? (f === 'CRITICAL' ? '#ef4444' : f === 'HIGH' ? '#f59e0b' : 'var(--fg)') : 'var(--dim)', borderColor: filter === f ? 'currentColor' : 'var(--border)' }}
                            >{f}</button>
                        ))}
                    </div>
                </div>

                {status && !isStreaming && (
                    <div style={{ padding: '10px 16px', fontSize: '0.75rem', color: 'var(--dim)', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                        {status}
                    </div>
                )}

                <div
                    className="table-container"
                    ref={containerRef}
                    onScroll={(e) => {
                        // Tighten threshold: only stick if truly at the top
                        isAtTopRef.current = e.target.scrollTop < 10
                    }}
                    style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}
                >
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--dim)' }}>
                                <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>HASH</th>
                                <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>FROM</th>
                                <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>TO</th>
                                <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>VALUE</th>
                                <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>RISK</th>
                                <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((tx) => (
                                <TransactionRow key={tx.hash} tx={tx} onAnalyze={handleAnalyze} />
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="empty-state">
                                        <div className="loading-spinner" style={{ margin: '20px auto' }} />
                                        <p>Waiting for transactions on {NETWORKS.find(n => n.id === network)?.label}…</p>
                                        <span className="dim" style={{ fontSize: '0.72rem' }}>WebSocket connected to real Ethereum mempool</span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="panel-footer dim" style={{ fontSize: '0.65rem', marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Click SIMULATE on any transaction to run it through the security engine</span>
                    <span>{filtered.length} shown · {txs.length} buffered</span>
                </div>
            </div>
        </div>
    )
}
