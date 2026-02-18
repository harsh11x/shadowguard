import { useState, useRef, useCallback } from 'react'

const PRESETS = [
    { label: 'ETH Transfer', from: '0x0000000000000000000000000000000000000001', to: '0x0000000000000000000000000000000000000002', value: '0.01', data: '0x' },
    { label: 'WETH', from: '0x0000000000000000000000000000000000000001', to: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', value: '0', data: '0x' },
    { label: 'USDC', from: '0x0000000000000000000000000000000000000001', to: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', value: '0', data: '0x' },
    { label: 'Aave V3', from: '0x0000000000000000000000000000000000000001', to: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951', value: '0', data: '0x' },
    { label: 'Uniswap', from: '0x0000000000000000000000000000000000000001', to: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008', value: '0', data: '0x' },
    { label: 'High Drain', from: '0x0000000000000000000000000000000000000001', to: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', value: '1.5', data: '0x' },
]

const STEP_LABELS = [
    '', // 0-indexed padding
    'Transaction Interception & Validation',
    'Pre-Execution State Snapshot',
    'Shadow Execution (eth_call)',
    'State Diff Computation',
    'Opcode Analysis',
    'Behavioral Analysis',
    'Risk Score Computation',
    'Security Policy Application',
]

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
                        typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString() : v.toFixed(6)) :
                            String(v)
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
                    status === 'done' ? 'DONE' :
                        status === 'error' ? 'ERROR' :
                            status === 'pending' ? 'PENDING' : ''}
            </div>
        </div>
    )
}

function RiskResult({ result }) {
    if (!result) return null
    const risk = result.record?.risk_report || {}
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
            </div>

            <div className="risk-bar-track">
                <div className={`risk-bar-fill ${level}`} style={{ width: `${score}%` }} />
            </div>

            {rules.length > 0 && (
                <div className="triggered-rules">
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--dim)', marginBottom: 6 }}>
                        Triggered Rules ({rules.length})
                    </div>
                    {rules.map((r, i) => (
                        <div key={i} className="rule-item">▸ {r}</div>
                    ))}
                </div>
            )}

            {violations.length > 0 && (
                <div className="triggered-rules" style={{ marginTop: 12 }}>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--red)', marginBottom: 6 }}>
                        Policy Violations ({violations.length})
                    </div>
                    {violations.map((v, i) => (
                        <div key={i} className="violation-item">⛔ {v}</div>
                    ))}
                </div>
            )}

            <div style={{ marginTop: 16, padding: '12px 16px', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
                <div style={{ color: 'var(--dim)', marginBottom: 6, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Simulation Summary</div>
                <div className="step-kv"><span className="step-kv-key">Simulation ID</span><span className="step-kv-val">{result.record?.simulation_id}</span></div>
                <div className="step-kv"><span className="step-kv-key">Execution Time</span><span className="step-kv-val">{result.execution_time_s?.toFixed(2)}s</span></div>
                <div className="step-kv"><span className="step-kv-key">Deterministic Hash</span><span className="step-kv-val dim">{result.record?.deterministic_hash?.slice(0, 32)}…</span></div>
            </div>
        </div>
    )
}

export default function Simulate() {
    const [form, setForm] = useState({
        from: '0x0000000000000000000000000000000000000001',
        to: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
        value: '0',
        data: '0x',
    })
    const [running, setRunning] = useState(false)
    const [steps, setSteps] = useState([])   // { step, status, data }
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [connected, setConnected] = useState(false)
    const esRef = useRef(null)

    const applyPreset = (p) => {
        setForm({ from: p.from, to: p.to, value: p.value, data: p.data })
        setSteps([])
        setResult(null)
        setError(null)
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

    const runSimulation = async () => {
        if (running) return
        setRunning(true)
        setSteps([])
        setResult(null)
        setError(null)
        setConnected(false)

        // Close any existing SSE
        if (esRef.current) esRef.current.abort()

        const controller = new AbortController()
        esRef.current = controller

        try {
            const res = await fetch('/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: form.from,
                    to: form.to,
                    value: parseFloat(form.value) || 0,
                    data: form.data || '0x',
                }),
                signal: controller.signal,
            })

            if (!res.ok) {
                const err = await res.json()
                setError(err.error || 'Request failed')
                setRunning(false)
                return
            }

            setConnected(true)
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
                    try {
                        const msg = JSON.parse(line.slice(6))
                        handleMessage(msg)
                    } catch { }
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') setError(e.message)
        } finally {
            setRunning(false)
        }
    }

    const handleMessage = (msg) => {
        if (msg.type === 'start') return
        if (msg.type === 'connecting') return
        if (msg.type === 'connected') return

        if (msg.type === 'step') {
            const hasData = msg.data && Object.keys(msg.data).length > 0
            updateStep(msg.step, hasData ? 'done' : 'running', msg.data)
        }

        if (msg.type === 'error') {
            setError(msg.message)
        }

        if (msg.type === 'result') {
            setResult(msg)
        }

        if (msg.type === 'done') {
            setRunning(false)
        }
    }

    const allStepNums = [1, 2, 3, 4, 5, 6, 7, 8]

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-title">Simulate Transaction</div>
                <div className="page-subtitle">Pre-execution security analysis on Ethereum Sepolia — no gas spent</div>
            </div>

            {/* Presets */}
            <div className="presets-strip">
                {PRESETS.map(p => (
                    <button key={p.label} className="preset-btn" onClick={() => applyPreset(p)}>
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Form */}
            <div className="panel" style={{ marginBottom: 24 }}>
                <div className="panel-header">
                    <span className="panel-title">Transaction Parameters</span>
                </div>
                <div className="panel-body">
                    <div className="form-grid">
                        <div className="field span-2">
                            <label>From Address</label>
                            <input
                                value={form.from}
                                onChange={e => setForm(f => ({ ...f, from: e.target.value }))}
                                placeholder="0x..."
                                spellCheck={false}
                            />
                        </div>
                        <div className="field span-2">
                            <label>To Address (Contract or EOA)</label>
                            <input
                                value={form.to}
                                onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
                                placeholder="0x..."
                                spellCheck={false}
                            />
                        </div>
                        <div className="field">
                            <label>Value (ETH)</label>
                            <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={form.value}
                                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                                placeholder="0.0"
                            />
                        </div>
                        <div className="field">
                            <label>Calldata (hex)</label>
                            <input
                                value={form.data}
                                onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                                placeholder="0x"
                                spellCheck={false}
                            />
                        </div>
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button
                            className="btn btn-primary"
                            onClick={runSimulation}
                            disabled={running}
                        >
                            {running ? <><span className="spinner" /> RUNNING…</> : '▶ RUN SIMULATION'}
                        </button>
                        {running && (
                            <button className="btn btn-ghost btn-sm" onClick={() => { esRef.current?.abort(); setRunning(false) }}>
                                ✕ ABORT
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{ padding: '12px 16px', border: '2px solid var(--red)', color: 'var(--red)', marginBottom: 16, fontSize: '0.82rem' }}>
                    ✗ {error}
                </div>
            )}

            {/* Step stream */}
            {(steps.length > 0 || running) && (
                <div className="panel">
                    <div className="panel-header">
                        <span className="panel-title">
                            {running ? <><span className="spinner" style={{ marginRight: 8 }} />Live Simulation Pipeline</> : '✓ Simulation Complete'}
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

            {/* Result */}
            {result && <RiskResult result={result} />}
        </div>
    )
}
