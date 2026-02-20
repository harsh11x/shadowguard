
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UsageChart = ({ data }) => {
    if (!data || data.length === 0) return <div className="dim font-mono text-center py-4 uppercase tracking-widest">// NO_DATA_STREAM</div>;
    const max = Math.max(...data.map(d => parseInt(d.count)), 10);
    return (
        <div className="usage-chart-container" style={{ height: '120px', display: 'flex', alignItems: 'flex-end', gap: '4px', padding: '10px 0' }}>
            {data.map((d, i) => {
                const h = (d.count / max) * 100;
                return (
                    <div key={i} style={{ flex: 1, backgroundColor: 'rgba(0, 255, 136, 0.1)', position: 'relative', height: '100%' }}>
                        <div className="hud-usage-fill" style={{ height: `${h}%`, position: 'absolute', bottom: 0, width: '100%' }}></div>
                    </div>
                );
            })}
        </div>
    );
};

const UserDetailModal = ({ uid, onClose, token, onUpdate }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/admin/users/${uid}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { setUser(d); setLoading(false); })
            .catch(e => console.error(e));
    }, [uid]);

    if (!user && loading) return (
        <div className="hud-modal-overlay">
            <div className="good font-mono animate-pulse tracking-widest">ACCESSING_SECURE_NODE...</div>
        </div>
    );
    if (!user) return null;

    const { user: profile, keys, history } = user;

    return (
        <div className="hud-modal-overlay">
            <div className="hud-modal-content hud-animate-in">
                <div className="hud-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div className="hud-title">Operative_Dossier_v4.2</div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginTop: '4px' }}>{profile.name}</h2>
                    </div>
                    <button onClick={onClose} className="hud-btn" style={{ padding: '4px 12px' }}>CLOSE</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', padding: '24px', flex: 1, overflowY: 'auto' }}>
                    <div className="sidebar-hud">
                        <div className="hud-card" style={{ padding: '20px', marginBottom: '16px' }}>
                            <div className="hud-title">Account_Status</div>
                            <div className={`hud-badge ${profile.status === 'active' ? 'good' : 'bad'}`} style={{ marginTop: '8px', display: 'inline-block' }}>
                                {profile.status}
                            </div>
                            <div style={{ marginTop: '16px' }}>
                                <div className="hud-title">API_REQUESTS</div>
                                <div className="hud-value" style={{ fontSize: '1.8rem' }}>{profile.total_usage || 0}</div>
                            </div>
                        </div>

                        <div className="admin-controls" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {profile.status !== 'banned' && (
                                <button onClick={() => onUpdate(profile.uid, 'banned', 7)} className="hud-btn hud-btn-danger">RESTRICT_ACCESS</button>
                            )}
                            {profile.status === 'banned' && (
                                <button onClick={() => onUpdate(profile.uid, 'active')} className="hud-btn hud-btn-primary">RESTORE_UPLINK</button>
                            )}
                            {profile.status === 'pending' && (
                                <>
                                    <button onClick={() => onUpdate(profile.uid, 'active')} className="hud-btn hud-btn-primary">APPROVE_ENTRY</button>
                                    <button onClick={() => onUpdate(profile.uid, 'rejected')} className="hud-btn">REJECT_ENTRY</button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="main-hud-content">
                        <div className="hud-card" style={{ padding: '20px', marginBottom: '24px' }}>
                            <div className="hud-title">Activity_Telemetry</div>
                            <UsageChart data={history} />
                        </div>

                        <div className="hud-card" style={{ padding: '20px' }}>
                            <div className="hud-title">Provisioned_Keys</div>
                            <div style={{ marginTop: '12px' }}>
                                {keys.map(k => (
                                    <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div className="font-mono text-xs text-white">
                                            {k.key_prefix}•••• <span className="dim">[{k.name}]</span>
                                        </div>
                                        <div className="good font-mono text-xs">{k.usage_count} RX</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function Admin() {
    const [users, setUsers] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('active'); // active, pending
    const [selectedUid, setSelectedUid] = useState(null);
    const navigate = useNavigate();
    const token = localStorage.getItem('sg_dev_token');

    useEffect(() => {
        if (!token) navigate('/admin/login');
        else fetchData();
    }, [token]);

    const fetchData = async () => {
        try {
            const [uRes, mRes] = await Promise.all([
                fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            if (!uRes.ok) {
                if (uRes.status === 401) navigate('/admin/login');
                throw new Error('Unauthorized');
            }
            const [uData, mData] = await Promise.all([uRes.json(), mRes.json()]);
            setUsers(uData);
            setMetrics(mData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (uid, status, banDays = 0) => {
        try {
            await fetch(`/api/admin/users/${uid}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status, ban_days: banDays })
            });
            fetchData();
        } catch (e) { console.error(e); }
    };

    const filteredUsers = users.filter(u => tab === 'active' ? u.status !== 'pending' : u.status === 'pending');

    if (loading && !users.length) return (
        <div className="hud-container" style={{ display: 'flex', alignItems: 'center', justify- content: 'center'
}}>
    <div className="good font-mono animate-pulse tracking-widest">INITIALIZING_ADMIN_UPLINK...</div>
        </div >
    );

return (
    <div className="hud-container hud-scanline">
        <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '24px' }}>
                <div>
                    <div className="hud-title" style={{ marginBottom: '8px' }}>CORE_ADMIN_INTERFACE_V4</div>
                    <h1 style={{ fontSize: '3rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em', margin: 0 }}>
                        SHADOWGUARD<span className="good">.ADMIN</span>
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={fetchData} className="hud-btn hud-btn-primary">SYNC_DATA</button>
                    <button onClick={() => { localStorage.removeItem('sg_dev_token'); navigate('/admin/login') }} className="hud-btn hud-btn-danger">TERMINATE_SESSION</button>
                </div>
            </div>

            {/* Metrics Grid */}
            {metrics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '48px' }}>
                    {[
                        ['OPERATIVES', metrics.total_users, 'hud-glow-blue'],
                        ['NEURAL_QUEUE', metrics.pending_users || 0, metrics.pending_users > 0 ? 'hud-glow-yellow' : ''],
                        ['ACTIVE_UPLINKS', metrics.active_keys, 'hud-glow-green'],
                        ['TOTAL_TRAFFIC', metrics.total_api_calls || 0, '']
                    ].map(([label, val, glow]) => (
                        <div key={label} className={`hud-card hud-animate-in ${glow}`} style={{ padding: '24px' }}>
                            <div className="hud-title">{label}</div>
                            <div className="hud-value" style={{ marginTop: '12px' }}>{val.toLocaleString()}</div>
                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', marginTop: '8px', letterSpacing: '0.2em' }}>STATUS_NOMINAL</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '0' }}>
                <button
                    onClick={() => setTab('active')}
                    className={`hud-btn ${tab === 'active' ? 'hud-btn-primary' : ''}`}
                    style={{ borderBottom: tab === 'active' ? 'none' : '1px solid rgba(255,255,255,0.1)', padding: '12px 24px' }}
                >
                    ACTIVE_CORPS
                </button>
                <button
                    onClick={() => setTab('pending')}
                    className={`hud-btn ${tab === 'pending' ? 'hud-btn-primary' : ''}`}
                    style={{ borderBottom: tab === 'pending' ? 'none' : '1px solid rgba(255,255,255,0.1)', padding: '12px 24px' }}
                >
                    VERIFICATION_QUEUE {metrics?.pending_users > 0 && `[${metrics.pending_users}]`}
                </button>
            </div>

            {/* Table HUD */}
            <div className="hud-glass hud-animate-in" style={{ padding: '20px', minHeight: '400px' }}>
                <table className="hud-table">
                    <thead>
                        <tr style={{ background: 'transparent' }}>
                            <th className="hud-title" style={{ textAlign: 'left' }}>OPERATIVE</th>
                            <th className="hud-title" style={{ textAlign: 'left' }}>AUTH_LINK</th>
                            <th className="hud-title" style={{ textAlign: 'left' }}>STATUS</th>
                            <th className="hud-title" style={{ textAlign: 'left' }}>THROUGHPUT</th>
                            <th className="hud-title" style={{ textAlign: 'right' }}>CONTROL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr><td colSpan="5" className="empty-state font-mono">// NO_RECORDS_DETECTED</td></tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.uid} onClick={() => setSelectedUid(user.uid)} style={{ cursor: 'pointer' }}>
                                <td style={{ fontWeight: 800 }}>{user.name} <div className="dim" style={{ fontSize: '0.7rem', fontWeight: 400 }}>{user.company || 'INDEPENDENT'}</div></td>
                                <td className="font-mono" style={{ fontSize: '0.8rem' }}>{user.email}</td>
                                <td>
                                    <span className={`hud-badge ${user.status === 'active' ? 'good' : 'bad'}`}>{user.status}</span>
                                </td>
                                <td className="font-mono">{user.total_usage || 0} RX</td>
                                <td style={{ textAlign: 'right' }}>
                                    <span className="good font-mono" style={{ fontSize: '0.7rem' }}>OPEN_DOSSIER →</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {selectedUid && (
            <UserDetailModal
                uid={selectedUid}
                onClose={() => setSelectedUid(null)}
                token={token}
                onUpdate={handleStatusChange}
            />
        )}
    </div>
);
}

