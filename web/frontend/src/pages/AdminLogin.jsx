
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');
            localStorage.setItem('sg_dev_token', data.token);
            navigate('/admin');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="hud-container hud-scanline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="hud-glass hud-animate-in" style={{ width: '100%', maxWidth: '420px', padding: '48px', position: 'relative' }}>

                {/* Visual HUD Accents */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', borderTop: '2px solid var(--green)', borderLeft: '2px solid var(--green)', opacity: 0.5 }}></div>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', borderTop: '2px solid var(--green)', borderRight: '2px solid var(--green)', opacity: 0.5 }}></div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '40px', borderBottom: '2px solid var(--green)', borderLeft: '2px solid var(--green)', opacity: 0.5 }}></div>
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '40px', borderBottom: '2px solid var(--green)', borderRight: '2px solid var(--green)', opacity: 0.5 }}></div>

                <div className="hud-title" style={{ textAlign: 'center', marginBottom: '16px' }}>Secure_Access_Protocol</div>
                <h1 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, marginBottom: '8px', color: 'white', letterSpacing: '-0.02em' }}>
                    SHADOWGUARD<span className="good">.CORE</span>
                </h1>
                <p className="dim font-mono" style={{ textAlign: 'center', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '40px' }}>
                    // Authorized_Personnel_Only
                </p>

                {error && (
                    <div className="hud-badge bad" style={{ width: '100%', padding: '12px', marginBottom: '24px', textAlign: 'center', display: 'block' }}>
                        AUTH_FAILURE: {error.toUpperCase().replace(/ /g, '_')}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '24px' }}>
                        <label className="hud-title" style={{ display: 'block', marginBottom: '8px' }}>Operator_Ident</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', color: 'white', fontFamily: 'var(--mono)', fontSize: '0.85rem' }}
                            placeholder="admin@shadowguard.local"
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '40px' }}>
                        <label className="hud-title" style={{ display: 'block', marginBottom: '8px' }}>Auth_Key</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', color: 'white', fontFamily: 'var(--mono)', fontSize: '0.85rem' }}
                            placeholder="••••••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="hud-btn hud-btn-primary"
                        style={{ width: '100%', padding: '16px', fontSize: '0.8rem' }}
                    >
                        {loading ? 'ESTABLISHING_LINK...' : 'INITIATE_UPLINK'}
                    </button>
                </form>

                <div style={{ marginTop: '48px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                    <div className="dim font-mono" style={{ fontSize: '0.6rem' }}>NODE_ID: SG-MAIN-7</div>
                    <div className="dim font-mono" style={{ fontSize: '0.6rem' }}>LOC: {window.location.hostname}</div>
                </div>
            </div>

            <div style={{ position: 'absolute', bottom: '24px', left: '0', width: '100%', textAlign: 'center' }}>
                <span className="dim font-mono" style={{ fontSize: '0.6rem', opacity: 0.3 }}>SHADOWGUARD // DECENTRALIZED_SECURITY_INFRASTRUCTURE</span>
            </div>
        </div>
    );
}

