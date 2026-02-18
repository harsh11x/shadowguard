import { useState, useCallback } from 'react'

// Known Mainnet contract labels
const KNOWN = {
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': { label: 'WETH (Mainnet)', type: 'ERC20', verified: true },
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D': { label: 'Uniswap V2 Router', type: 'DEX', verified: true },
    '0x87870B2ee3Ac9229394e19bd52C4097a1fC97441': { label: 'Aave V3 Pool', type: 'Lending', verified: true },
    '0x000000000022d473030f116ddee9f6b43ac78ba3': { label: 'Permit2', type: 'Utility', verified: true },

    '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266': { label: 'Hardhat Account #0', type: 'EOA', verified: false },
    '0x0000000000000000000000000000000000000001': { label: 'Precompile: ecRecover', type: 'Precompile', verified: true },
    '0x0000000000000000000000000000000000000002': { label: 'Precompile: SHA-256', type: 'Precompile', verified: true },
}

// Known 4-byte function selectors
const SELECTORS = {
    '0xa9059cbb': 'transfer(address,uint256)',
    '0x23b872dd': 'transferFrom(address,address,uint256)',
    '0x095ea7b3': 'approve(address,uint256)',
    '0x70a08231': 'balanceOf(address)',
    '0x18160ddd': 'totalSupply()',
    '0xd0e30db0': 'deposit()',
    '0x2e1a7d4d': 'withdraw(uint256)',
    '0x3593badf': 'execute(bytes,bytes[],uint256)',  // Uniswap Universal Router
    '0x617ba037': 'supply(address,uint256,address,uint16)',  // Aave
    '0x2b68b191': 'permitTransferFrom(...)',  // Permit2
    '0x38ed1739': 'swapExactTokensForTokens(...)',
    '0x7ff36ab5': 'swapExactETHForTokens(...)',
    '0x5c11d795': 'swapExactTokensForTokensSupportingFeeOnTransferTokens(...)',
    '0xe8e33700': 'addLiquidity(...)',
    '0xf305d719': 'addLiquidityETH(...)',
    '0xbaa2abde': 'removeLiquidity(...)',
    '0x42966c68': 'burn(uint256)',
    '0x40c10f19': 'mint(address,uint256)',
    '0x6a627842': 'mint(address)',
    '0x1249c58b': 'mint()',
    '0xa22cb465': 'setApprovalForAll(address,bool)',
    '0x42842e0e': 'safeTransferFrom(address,address,uint256)',
    '0xb88d4fde': 'safeTransferFrom(address,address,uint256,bytes)',
    '0xe985e9c5': 'isApprovedForAll(address,address)',
    '0x6352211e': 'ownerOf(uint256)',
    '0xc87b56dd': 'tokenURI(uint256)',
}

function decodeCalldata(hex) {
    if (!hex || hex === '0x' || hex.length < 10) return null
    const selector = hex.slice(0, 10).toLowerCase()
    const sig = SELECTORS[selector]
    const params = hex.slice(10)
    const chunks = []
    for (let i = 0; i < params.length; i += 64) {
        chunks.push('0x' + params.slice(i, i + 64))
    }
    return { selector, sig: sig || 'Unknown function', params: chunks }
}

function AddressCard({ info, loading }) {
    if (loading) return <div style={{ padding: 24, color: 'var(--dim)' }}><span className="spinner" /> Fetching on-chain data…</div>
    if (!info) return null

    const known = KNOWN[info.address?.toLowerCase()]
    const isContract = info.is_contract || info.code_size > 0

    return (
        <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-header">
                <span className="panel-title">
                    {known ? `${known.label} ${known.verified ? '✓' : ''}` : isContract ? '📄 Contract' : '👤 EOA'}
                </span>
                <span className={`tag ${isContract ? 'tag-yellow' : 'tag-green'}`}>{isContract ? 'CONTRACT' : 'EOA'}</span>
            </div>
            <div className="panel-body">
                {info.error && (
                    <div style={{ color: 'var(--red)', fontSize: '0.8rem', marginBottom: 12 }}>⚠ RPC error: {info.error} — showing cached data only</div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>On-Chain Data</div>
                        {[
                            { k: 'Address', v: info.address },
                            { k: 'Balance', v: info.balance_eth != null ? `${info.balance_eth} ETH` : '—' },
                            { k: 'Nonce', v: info.nonce != null ? info.nonce : '—' },
                            { k: 'Code Size', v: info.code_size != null ? `${info.code_size} bytes` : '—' },
                            { k: 'Block', v: info.block?.toLocaleString() ?? '—' },
                        ].map(({ k, v }) => (
                            <div key={k} className="step-kv" style={{ marginBottom: 4 }}>
                                <span className="step-kv-key">{k}</span>
                                <span className="step-kv-val mono" style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>{String(v)}</span>
                            </div>
                        ))}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Classification</div>
                        {known && (
                            <>
                                <div className="step-kv" style={{ marginBottom: 4 }}>
                                    <span className="step-kv-key">Label</span>
                                    <span className="step-kv-val good">{known.label}</span>
                                </div>
                                <div className="step-kv" style={{ marginBottom: 4 }}>
                                    <span className="step-kv-key">Type</span>
                                    <span className="step-kv-val">{known.type}</span>
                                </div>
                                <div className="step-kv" style={{ marginBottom: 4 }}>
                                    <span className="step-kv-key">Verified</span>
                                    <span className={`step-kv-val ${known.verified ? 'good' : 'warn'}`}>{known.verified ? 'YES' : 'NO'}</span>
                                </div>
                            </>
                        )}
                        {!known && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--dim)' }}>Unknown address — not in known contracts directory</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function Inspector() {
    const [addrInput, setAddrInput] = useState('')
    const [addrInfo, setAddrInfo] = useState(null)
    const [addrLoading, setAddrLoading] = useState(false)

    const [calldataInput, setCalldataInput] = useState('')
    const [decoded, setDecoded] = useState(null)

    const lookup = useCallback(async (addr) => {
        const a = (addr || addrInput).trim()
        if (!a) return
        setAddrLoading(true)
        setAddrInfo(null)
        try {
            const r = await fetch(`/api/address/${a}`)
            const d = await r.json()
            setAddrInfo(d)
        } catch (e) {
            setAddrInfo({ address: a, error: e.message })
        } finally {
            setAddrLoading(false)
        }
    }, [addrInput])

    const decodeHex = () => {
        const result = decodeCalldata(calldataInput.trim())
        setDecoded(result)
    }

    const QUICK_ADDRS = Object.entries(KNOWN).map(([addr, info]) => ({ addr, ...info }))

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-title">Contract Inspector</div>
                <div className="page-subtitle">Real-time on-chain address lookup & calldata decoder — Ethereum Mainnet</div>

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Address Lookup */}
                <div>
                    <div className="panel" style={{ marginBottom: 16 }}>
                        <div className="panel-header"><span className="panel-title">Address Lookup</span></div>
                        <div className="panel-body">
                            <div style={{ fontSize: '0.72rem', color: 'var(--dim)', marginBottom: 12 }}>
                                Fetches live balance, nonce, and code size from Ethereum Mainnet RPC
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    value={addrInput}
                                    onChange={e => setAddrInput(e.target.value)}
                                    placeholder="0x... (any Ethereum address)"

                                    spellCheck={false}
                                    style={{ flex: 1 }}
                                    onKeyDown={e => e.key === 'Enter' && lookup()}
                                />
                                <button className="btn btn-primary btn-sm" onClick={() => lookup()} disabled={addrLoading}>
                                    {addrLoading ? <span className="spinner" /> : '⬡ Lookup'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <AddressCard info={addrInfo} loading={addrLoading} />
                </div>

                {/* Calldata Decoder */}
                <div>
                    <div className="panel" style={{ marginBottom: 16 }}>
                        <div className="panel-header"><span className="panel-title">Calldata Decoder</span></div>
                        <div className="panel-body">
                            <div style={{ fontSize: '0.72rem', color: 'var(--dim)', marginBottom: 12 }}>
                                Decode function selector and ABI-encoded parameters from raw calldata hex
                            </div>
                            <textarea
                                value={calldataInput}
                                onChange={e => setCalldataInput(e.target.value)}
                                placeholder="0xa9059cbb000000000000000000000000..."
                                spellCheck={false}
                                style={{ width: '100%', height: 80, fontFamily: 'monospace', fontSize: '0.72rem', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--white)', padding: 8, resize: 'vertical', boxSizing: 'border-box' }}
                            />
                            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={decodeHex}>⬡ Decode</button>

                            {decoded && (
                                <div style={{ marginTop: 12 }}>
                                    <div className="step-kv" style={{ marginBottom: 6 }}>
                                        <span className="step-kv-key">Selector</span>
                                        <span className="step-kv-val mono">{decoded.selector}</span>
                                    </div>
                                    <div className="step-kv" style={{ marginBottom: 6 }}>
                                        <span className="step-kv-key">Function</span>
                                        <span className="step-kv-val good" style={{ fontSize: '0.72rem' }}>{decoded.sig}</span>
                                    </div>
                                    {decoded.params.length > 0 && (
                                        <div style={{ marginTop: 8 }}>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>ABI-Encoded Params ({decoded.params.length})</div>
                                            {decoded.params.map((p, i) => (
                                                <div key={i} className="step-kv" style={{ marginBottom: 4 }}>
                                                    <span className="step-kv-key">param[{i}]</span>
                                                    <span className="mono dim" style={{ fontSize: '0.68rem', wordBreak: 'break-all' }}>{p}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {calldataInput && !decoded && calldataInput !== '0x' && (
                                <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--dim)' }}>
                                    Click Decode to analyze the calldata
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Known Contracts Directory */}
            <div className="panel" style={{ marginTop: 16 }}>
                <div className="panel-header"><span className="panel-title">Known Contracts — Ethereum Mainnet</span></div>

                <div className="panel-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                        {QUICK_ADDRS.map(({ addr, label, type, verified }) => (
                            <div key={addr}
                                style={{ padding: '10px 12px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.2s' }}
                                onClick={() => { setAddrInput(addr); lookup(addr) }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--yellow)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--white)' }}>{label} {verified && <span className="good">✓</span>}</span>
                                    <span style={{ fontSize: '0.6rem', color: 'var(--dim)', border: '1px solid var(--border)', padding: '1px 5px' }}>{type}</span>
                                </div>
                                <div className="mono dim" style={{ fontSize: '0.65rem' }}>{addr.slice(0, 20)}…{addr.slice(-6)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
