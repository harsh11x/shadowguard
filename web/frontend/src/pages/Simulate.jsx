import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Real Sepolia deployed contracts
const PRESETS = [
    {
        label: 'ETH Transfer',
        from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        value: '0.01', data: '0x',
        desc: 'Simple ETH transfer between two EOAs on Sepolia'
    },
    {
        label: 'WETH Deposit',
        from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        to: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
        value: '0.05', data: '0xd0e30db0',
        desc: 'Wrap ETH into WETH via deposit() on Sepolia WETH contract'
    },
    {
        label: 'ERC20 Approve',
        from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        to: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
        value: '0',
        data: '0x095ea7b3000000000000000000000000c532a74256d3db42d0bf7a0400fefdbad7694008ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        desc: 'Approve Uniswap Router to spend max WETH — common DeFi pattern'
    },
    {
        label: 'Uniswap Swap',
        from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        to: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008',
        value: '0',
        data: '0x38ed17390000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000000000001',
        desc: 'Swap tokens via Uniswap V2 Router on Sepolia'
    },
    {
        label: 'High Drain',
        from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        to: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
        value: '1.5', data: '0x',
        desc: '⚠ Sends 1.5 ETH — triggers balance drain risk rule'
    },
    {
        label: 'Aave Supply',
        from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        to: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
        value: '0',
        data: '0x617ba0370000000000000000000000007b79995e5f793a07bc00c21412e50ecae098e7f90000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000000000000000000000000000000000000000000000',
        desc: 'Supply WETH to Aave lending pool on Sepolia'
    },
    {
        label: 'Permit2 Drain',
        from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        to: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
        value: '0',
        data: '0x2b68b1910000000000000000000000000000000000000000000000000000000000000040',
        desc: '🚨 Malicious Permit2 drain — triggers CRITICAL risk score'
    },
    {
        label: 'NFT Transfer',
        from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        to: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
        value: '0',
        data: '0x42842e0e000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000000000000000000dead0000000000000000000000000000000000000000000000000000000000000001',
        desc: 'safeTransferFrom — NFT transfer to burn address'
    },
]

const STEP_LABELS = [
    '', 'Transaction Interception & Validation', 'Pre-Execution State Snapshot',
    'Shadow Execution (eth_call)', 'State Diff Computation', 'Opcode Analysis',
    'Behavioral Analysis', 'Risk Score Computation', 'Security Policy Application',
]

const LEVEL_TAG = { LOW: 'tag-green', MEDIUM: 'tag-yellow', HIGH: 'tag-orange', CRITICAL: 'tag-red' }

function StepRow({ step, status, data }) {
    const numClass = status === 'done' ? 'done' : status === 'running' ? 'active' : ''
    const statusClass = status === 'done' ? 'done' : status === 'running' ? 'running' : status === 'error' ? 'error' : ''

    const renderData = () => {
        if (!data || Object.keys(data).length === 0) return null
        const entries = Object.entries(data).slice(0, 8)
        return (
            <div className="step-data">
                {entries.map(([k, v]) => {
                    let valClass = ''
                    if (k.includes('drain') && parseFloat(v) > 50) valClass = 'bad'
                    else if (k.includes('drain') && parseFloat(v) > 20) valClass = 'warn'
                    else if (k === 'success' && v === true) valClass = 'good'
                    else if (k === 'success' && v === false) valClass = 'bad'
                    else if (k === 'gas_anomaly' && v) valClass = 'warn'
                    else if (k.includes('selfdestruct') && v > 0) valClass = 'bad'
                    else if (k.includes('delegatecall') && v > 0) valClass = 'warn'
                    const display = typeof v === 'boolean' ? (v ? 'YES' : 'NO') :
                        typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString() : v.toFixed(6)) : String(v)
                    return (
                        <div key={k} className="step-kv">
                            <span className="step-kv-key">{k.replace(/_/g, ' ')}</span>
                            <span className={`step-kv-val ${valClass}`}>{display}</span>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="step-item">
            <div className={`step-num ${numClass}`}>
                {status === 'done' ? '✓' : status === 'running' ? '▶' : status === 'error' ? '✗' : String(step).padStart(2, '0')}
            </div>
            <div>
                <div className="step-label">{STEP_LABELS[step] || `Step ${step}`}</div>
                {renderData()}
            </div>
            <div className={`step-status ${statusClass}`}>
                {status === 'running' ? <><span className="spinner" /> RUNNING</> :
                    status === 'done' ? 'DONE' : status === 'error' ? 'ERROR' : status === 'pending' ? 'PENDING' : ''}
            </div>
        </div>
    )
}

function RiskResult({ result, onReplay }) {
    if (!result) return null
    const risk = result.record?.risk_report || {}
    const exec = result.record?.execution_result || {}
    const score = risk.score ?? 0
    const level = risk.level ?? 'LOW'
    const rules = risk.triggered_rules || []
    const violations = risk.policy_violations || []
    const rec = risk.recommendation || ''

    return (
        <div className="risk-result">
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--dim)', marginBottom: 16 }}>
                ── RISK ASSESSMENT ──────────────────────────────────────────
            </div>
            <div className="risk-score-row">
                <div>
                    <div className="risk-label">Risk Score</div>
                    <div className={`risk-score-num ${level}`}>{score}</div>
                    <div className="risk-label">/ 100</div>
                </div>
                <div>
                    <div className="risk-label" style={{ marginBottom: 8 }}>Level</div>
                    <div className={`risk-level-badge ${level}`}>{level}</div>
                    <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--dim)', maxWidth: 300 }}>{rec}</div>
                </div>
                <div>
                    <div className="risk-label" style={{ marginBottom: 8 }}>Execution</div>
                    <div style={{ fontSize: '0.78rem' }}>
                        <div className="step-kv" style={{ marginBottom: 4 }}>
                            <span className="step-kv-key">Success</span>
                            <span className={`step-kv-val ${exec.success ? 'good' : 'bad'}`}>{exec.success ? 'YES' : 'NO'}</span>
                        </div>
                        <div className="step-kv" style={{ marginBottom: 4 }}>
                            <span className="step-kv-key">Gas Used</span>
                            <span className="step-kv-val">{exec.gas_used?.toLocaleString()}</span>
                        </div>
                        <div className="step-kv" style={{ marginBottom: 4 }}>
                            <span className="step-kv-key">Reverted</span>
                            <span className={`step-kv-val ${exec.reverted ? 'bad' : 'good'}`}>{exec.reverted ? 'YES' : 'NO'}</span>
                        </div>
                        {exec.revert_reason && (
                            <div className="step-kv">
                                <span className="step-kv-key">Reason</span>
                                <span className="step-kv-val bad" style={{ fontSize: '0.68rem' }}>{exec.revert_reason}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="risk-bar-track">
                <div className={`risk-bar-fill ${level}`} style={{ width: `${score}%` }} />
            </div>

            {rules.length > 0 && (
                <div className="triggered-rules">
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--dim)', marginBottom: 6 }}>
                        Triggered Rules ({rules.length})
                    </div>
                    {rules.map((r, i) => <div key={i} className="rule-item">▸ {r}</div>)}
                </div>
            )}

            {violations.length > 0 && (
                <div className="triggered-rules" style={{ marginTop: 12 }}>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--red)', marginBottom: 6 }}>
                        Policy Violations ({violations.length})
                    </div>
                    {violations.map((v, i) => <div key={i} className="violation-item">⛔ {v}</div>)}
                </div>
            )}

            <div style={{ marginTop: 16, padding: '12px 16px', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                <div style={{ color: 'var(--dim)', marginBottom: 6, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Simulation Summary</div>
                <div className="step-kv"><span className="step-kv-key">Simulation ID</span><span className="step-kv-val mono">{result.record?.simulation_id}</span></div>
                <div className="step-kv"><span className="step-kv-key">Execution Time</span><span className="step-kv-val">{result.execution_time_s?.toFixed(2)}s</span></div>
                <div className="step-kv"><span className="step-kv-key">Deterministic Hash</span><span className="step-kv-val dim mono">{result.record?.deterministic_hash?.slice(0, 32)}…</span></div>
                <div className="step-kv"><span className="step-kv-key">Network</span><span className="step-kv-val good">Ethereum Mainnet (Chain 1)</span></div>

            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                    const url = new URL(window.location.href)
                    url.searchParams.set('sim', result.record?.simulation_id || '')
                    navigator.clipboard.writeText(url.toString())
                }}>⎘ Copy Link</button>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = `${result.record?.simulation_id || 'sim'}.json`
                    a.click()
                }}>↓ Export JSON</button>
            </div>
        </div>
    )
}

export default function Simulate() {
    const navigate = useNavigate()
    const [form, setForm] = useState({
        from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        to: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
        value: '0',
        data: '0x',
    })
    const [running, setRunning] = useState(false)
    const [steps, setSteps] = useState([])
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [activePreset, setActivePreset] = useState(null)
    const [addressBook, setAddressBook] = useState(() => {
        try { return JSON.parse(localStorage.getItem('sg_address_book') || '[]') } catch { return [] }
    })
    const [showBook, setShowBook] = useState(false)
    const [decodedSelector, setDecodedSelector] = useState(null)
    const esRef = useRef(null)

    // Decode selector on calldata change
    useEffect(() => {
        const hex = form.data?.trim()
        if (hex && hex.length >= 10 && hex !== '0x') {
            const sel = hex.slice(0, 10).toLowerCase()
            const SELECTORS = {
                '0xa9059cbb': 'transfer(address,uint256)',
                '0x23b872dd': 'transferFrom(address,address,uint256)',
                '0x095ea7b3': 'approve(address,uint256)',
                '0xd0e30db0': 'deposit()',
                '0x2e1a7d4d': 'withdraw(uint256)',
                '0x3593badf': 'execute(bytes,bytes[],uint256)',
                '0x617ba037': 'supply(address,uint256,address,uint16)',
                '0x2b68b191': 'permitTransferFrom(...)',
                '0x38ed1739': 'swapExactTokensForTokens(...)',
                '0x7ff36ab5': 'swapExactETHForTokens(...)',
                '0x42842e0e': 'safeTransferFrom(address,address,uint256)',
                '0x40c10f19': 'mint(address,uint256)',
                '0xa22cb465': 'setApprovalForAll(address,bool)',
            }
            setDecodedSelector(SELECTORS[sel] ? { sel, fn: SELECTORS[sel] } : null)
        } else {
            setDecodedSelector(null)
        }
    }, [form.data])

    const applyPreset = (p, idx) => {
        setForm({ from: p.from, to: p.to, value: p.value, data: p.data })
        setSteps([]); setResult(null); setError(null); setActivePreset(idx)
    }

    const updateStep = useCallback((stepNum, status, data) => {
        setSteps(prev => {
            const existing = prev.findIndex(s => s.step === stepNum)
            if (existing >= 0) {
                const updated = [...prev]
                updated[existing] = { step: stepNum, status, data: data || updated[existing].data }
                return updated
            }
            return [...prev, { step: stepNum, status, data }]
        })
    }, [])

    const validate = () => {
        const addrRegex = /^0x[a-fA-F0-9]{40}$/
        const hexRegex = /^0x[a-fA-F0-9]*$/
        if (!addrRegex.test(form.from)) return 'Invalid sender address'
        if (!addrRegex.test(form.to)) return 'Invalid recipient address'
        if (isNaN(parseFloat(form.value)) || parseFloat(form.value) < 0) return 'Invalid value'
        if (!hexRegex.test(form.data)) return 'Invalid hex data'
        return null
    }

    const saveToBook = () => {
        const label = prompt('Label for this address?')
        if (!label) return
        const updated = [...addressBook, { label, address: form.to, timestamp: Date.now() }]
        setAddressBook(updated)
        localStorage.setItem('sg_address_book', JSON.stringify(updated))
    }

    const removeFromBook = (i) => {
        const updated = addressBook.filter((_, idx) => idx !== i)
        setAddressBook(updated)
        localStorage.setItem('sg_address_book', JSON.stringify(updated))
    }

    const runSimulation = async () => {
        if (running) return
        const err = validate()
        if (err) { setError(err); return }

        setRunning(true); setSteps([]); setResult(null); setError(null)
        if (esRef.current) esRef.current.abort()
        const controller = new AbortController()
        esRef.current = controller

        try {
            updateStep(0, 'running', { status: 'Connecting to Sepolia RPC…' })
            const res = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from: form.from, to: form.to, value: parseFloat(form.value) || 0, data: form.data || '0x' }),
                signal: controller.signal,
            })
            if (!res.ok) { const e = await res.json(); setError(e.error || 'Request failed'); setRunning(false); return }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buf = ''
            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buf += decoder.decode(value, { stream: true })
                const lines = buf.split('\n')
                buf = lines.pop()
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue
                    try { handleMessage(JSON.parse(line.slice(6))) } catch { }
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') setError(e.message)
        } finally {
            setRunning(false)
            setSteps(prev => prev.filter(s => s.step !== 0))
        }
    }

    const handleMessage = (msg) => {
        if (msg.type === 'step') {
            const hasData = msg.data && Object.keys(msg.data).length > 0
            updateStep(msg.step, hasData ? 'done' : 'running', msg.data)
        }
        if (msg.type === 'error') setError(msg.message)
        if (msg.type === 'result') setResult(msg)
        if (msg.type === 'done') setRunning(false)
    }

    const allStepNums = [1, 2, 3, 4, 5, 6, 7, 8]

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-title">Simulate Transaction</div>
                <div className="page-subtitle">Pre-execution security analysis on Ethereum Sepolia — no gas spent, real on-chain state</div>
            </div>

            {/* Presets */}
            <div className="presets-strip" style={{ flexWrap: 'wrap', gap: 6 }}>
                {PRESETS.map((p, i) => (
                    <button key={p.label}
                        className={`preset-btn ${activePreset === i ? 'active' : ''}`}
                        onClick={() => applyPreset(p, i)}
                        title={p.desc}
                    >{p.label}</button>
                ))}
            </div>
            {activePreset !== null && PRESETS[activePreset]?.desc && (
                <div style={{ fontSize: '0.72rem', color: 'var(--dim)', marginBottom: 12, padding: '6px 0' }}>
                    ℹ {PRESETS[activePreset].desc}
                </div>
            )}

            {/* Form */}
            <div className="panel" style={{ marginBottom: 24 }}>
                <div className="panel-header">
                    <span className="panel-title">Transaction Parameters</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowBook(!showBook)}>
                            📒 Address Book {addressBook.length > 0 && `(${addressBook.length})`}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={saveToBook} title="Save 'To' address to book">+ Save Address</button>
                    </div>
                </div>

                {showBook && addressBook.length > 0 && (
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {addressBook.map((a, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', border: '1px solid var(--border)', fontSize: '0.72rem' }}>
                                <span style={{ cursor: 'pointer', color: 'var(--yellow)' }} onClick={() => setForm(f => ({ ...f, to: a.address }))}>{a.label}</span>
                                <span className="dim" style={{ fontSize: '0.65rem' }}>{a.address.slice(0, 8)}…</span>
                                <span style={{ cursor: 'pointer', color: 'var(--red)', marginLeft: 4 }} onClick={() => removeFromBook(i)}>✕</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="panel-body">
                    <div className="form-grid">
                        <div className="field span-2">
                            <label>From Address <span className="dim" style={{ fontSize: '0.65rem' }}>(Sepolia EOA)</span></label>
                            <input value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} placeholder="0x..." spellCheck={false} />
                        </div>
                        <div className="field span-2">
                            <label>To Address <span className="dim" style={{ fontSize: '0.65rem' }}>(Contract or EOA)</span></label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))} placeholder="0x..." spellCheck={false} style={{ flex: 1 }} />
                                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/inspector?addr=${form.to}`)} title="Inspect this address">⬡</button>
                            </div>
                        </div>
                        <div className="field">
                            <label>Value (ETH)</label>
                            <input type="number" step="0.001" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0.0" />
                        </div>
                        <div className="field">
                            <label>
                                Calldata (hex)
                                {decodedSelector && (
                                    <span style={{ marginLeft: 8, fontSize: '0.65rem', color: 'var(--green)' }}>
                                        ✓ {decodedSelector.fn}
                                    </span>
                                )}
                            </label>
                            <input value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} placeholder="0x" spellCheck={false} />
                        </div>
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button className="btn btn-primary" onClick={runSimulation} disabled={running}>
                            {running ? <><span className="spinner" /> RUNNING…</> : '▶ RUN SIMULATION'}
                        </button>
                        {running && (
                            <button className="btn btn-ghost btn-sm" onClick={() => { esRef.current?.abort(); setRunning(false) }}>
                                ✕ ABORT
                            </button>
                        )}
                        <span className="dim" style={{ fontSize: '0.68rem' }}>Real Sepolia state · No gas spent · Results stored in SQLite</span>
                    </div>
                </div>
            </div>

            {error && (
                <div style={{ padding: '12px 16px', border: '2px solid var(--red)', color: 'var(--red)', marginBottom: 16, fontSize: '0.82rem' }}>
                    ✗ {error}
                </div>
            )}

            {(steps.length > 0 || running) && (
                <div className="panel">
                    <div className="panel-header">
                        <span className="panel-title">
                            {running ? <><span className="spinner" style={{ marginRight: 8 }} />Live Simulation Pipeline — Sepolia</> : '✓ Simulation Complete'}
                        </span>
                        <span className="dim" style={{ fontSize: '0.72rem' }}>
                            {steps.filter(s => s.status === 'done').length} / 8 steps
                        </span>
                    </div>
                    <div className="step-stream">
                        {allStepNums.map(n => {
                            const s = steps.find(x => x.step === n)
                            const status = s ? s.status : (running && steps.length > 0 && n === steps.length + 1 ? 'running' : 'pending')
                            return <StepRow key={n} step={n} status={status} data={s?.data} />
                        })}
                    </div>
                </div>
            )}

            {result && <RiskResult result={result} />}
        </div>
    )
}
