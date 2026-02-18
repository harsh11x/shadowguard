import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

function TransactionRow({ tx, onAnalyze }) {
    return (
        <tr className="live-tx-row">
            <td className="dim">#{tx.block}</td>
            <td>
                <span className="tx-hash-pill" title={tx.hash}>
                    {tx.hash.slice(0, 10)}...
                </span>
            </td>
            <td>
                <span className="addr-pill">{tx.from.slice(0, 6)}...{tx.from.slice(-4)}</span>
            </td>
            <td>
                {tx.to ? (
                    <span className="addr-pill">{tx.to.slice(0, 6)}...{tx.to.slice(-4)}</span>
                ) : (
                    <span className="badge-creation">DEPLOY</span>
                )}
            </td>
            <td className="mono">{tx.value_eth > 0 ? `${tx.value_eth.toFixed(4)} ETH` : '—'}</td>
            <td style={{ textAlign: 'right' }}>
                <button className="btn-small" onClick={() => onAnalyze(tx)}>ANALYZE</button>
            </td>
        </tr>
    )
}

export default function Live() {
    const [txs, setTxs] = useState([])
    const [isStreaming, setIsStreaming] = useState(false)
    const navigate = useNavigate()
    const esRef = useRef(null)

    useEffect(() => {
        // Connect to SSE stream
        const es = new EventSource('/api/live/stream')
        esRef.current = es
        setIsStreaming(true)

        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data)
                if (data.type === 'transaction') {
                    setTxs(prev => [data, ...prev].slice(0, 40))
                }
            } catch (err) {
                console.error('[live] SSE Parse Error:', err)
            }
        }

        es.onerror = () => {
            setIsStreaming(false)
            es.close()
        }

        return () => {
            if (esRef.current) esRef.current.close()
        }
    }, [])

    const handleAnalyze = (tx) => {
        const params = new URLSearchParams({
            from: tx.from,
            to: tx.to || '',
            value: tx.value_eth,
            data: '0x'
        })
        navigate(`/?${params.toString()}`)
    }

    return (
        <div className="page animate-fade-in">
            <div className="page-header">
                <div className="page-title">
                    LIVE STREAM <span className="pulse-red">●</span>
                </div>
                <div className="page-subtitle">
                    Real-time Ethereum Mainnet transaction feed. Quick analysis of pending/recent transactions.
                </div>
            </div>

            <div className="panel" style={{ borderTop: '4px solid var(--orange)' }}>
                <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>GLOBAL TRANSACTION FEED</span>
                    <span className={`status-pill ${isStreaming ? 'active' : 'offline'}`}>
                        {isStreaming ? '● STREAMING LIVE' : '○ RECONNECTING...'}
                    </span>
                </div>

                <div className="table-container" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>BLOCK</th>
                                <th>HASH</th>
                                <th>SENDER</th>
                                <th>RECIPIENT</th>
                                <th>VALUE</th>
                                <th style={{ textAlign: 'right' }}>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {txs.map((tx, idx) => (
                                <TransactionRow key={tx.hash + idx} tx={tx} onAnalyze={handleAnalyze} />
                            ))}
                            {txs.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="empty-state">
                                        <div className="loading-spinner" style={{ margin: '20px auto' }}></div>
                                        <p>Establishing connection to Ethereum Mainnet...</p>
                                        <span className="dim">Polling latest blocks for new transactions</span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="panel-footer dim" style={{ fontSize: '0.65rem', marginTop: '10px' }}>
                    * Analysis fetches latest state from Mainnet for high-fidelity results. Only first 25 txs per block shown in stream.
                </div>
            </div>
        </div>
    )
}
