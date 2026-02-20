
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Simple Bar Chart Component
const UsageChart = ({ data }) => {
    if (!data || data.length === 0) return <div className="text-gray-500 text-[10px] text-center py-8 tracking-widest">// NO DATA LINKED</div>;
    const max = Math.max(...data.map(d => parseInt(d.count)), 10);
    return (
        <div className="relative group bg-black/20 p-4 border border-white/5">
            <div className="flex items-end h-32 gap-1.5 overflow-hidden">
                {data.map((d, i) => {
                    const height = (d.count / max) * 100;
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center group/bar relative">
                            <div
                                className="w-full bg-green-500/20 group-hover/bar:bg-green-400 transition-all duration-300 relative"
                                style={{ height: `${height}%`, minHeight: '2px' }}
                            >
                                {height > 10 && (
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-green-400 shadow-[0_0_8px_#4ade80]" />
                                )}
                                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black border border-green-500/50 text-green-400 text-[9px] px-1.5 py-0.5 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none font-mono">
                                    {d.count} RX
                                </div>
                            </div>
                            <div className="text-[8px] text-gray-600 mt-2 font-mono uppercase tracking-tighter">
                                {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
        </div>
    );
};

// User Detail Modal
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
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="text-green-500 font-mono text-sm tracking-[0.3em] animate-pulse">
                INITIALIZING_USER_TERMINAL...
            </div>
        </div>
    );
    if (!user) return null;

    const { user: profile, keys, history } = user;

    return (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in">
            <div className="bg-[#050505] border border-white/10 w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,1)] flex flex-col relative">
                {/* HUD Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/20" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/20" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/20" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/20" />

                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-white/[0.02] to-transparent">
                    <div>
                        <div className="text-[10px] font-bold text-gray-500 tracking-[0.3em] mb-2 font-mono uppercase">Profile_Dossier_v2.0</div>
                        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
                            {profile.name}
                            <span className={`text-[10px] px-3 py-1 font-black tracking-widest border border-current bg-current/5 ${profile.status === 'active' ? 'text-green-400' :
                                profile.status === 'banned' ? 'text-red-500' : 'text-yellow-500'
                                }`}>{profile.status.toUpperCase()}</span>
                        </h2>
                        <div className="text-gray-400 text-sm font-mono mt-2 flex items-center gap-3">
                            <span className="text-white/20">EMAIL:</span> {profile.email}
                            <span className="text-white/10">|</span>
                            <span className="text-white/20">ORG:</span> {profile.company || 'UNAVAILABLE'}
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all text-2xl border border-white/10">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Sidebar: Controls & Core Metrics */}
                        <div className="lg:col-span-4 space-y-8">
                            <div className="space-y-4">
                                <div className="bg-white/[0.02] p-6 border border-white/5">
                                    <div className="text-gray-500 text-[9px] font-bold tracking-[0.2em] mb-4 font-mono uppercase">Accumulated_Usage</div>
                                    <div className="text-5xl font-black tracking-tighter text-white tabular-nums">
                                        {profile.total_usage || 0}
                                        <span className="text-xs text-gray-600 ml-2 tracking-normal font-normal">API_REQS</span>
                                    </div>
                                    {keys.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-white/5 text-[10px] font-mono text-gray-400 uppercase tracking-widest flex justify-between">
                                            <span>Tier_Assignment</span>
                                            <span className="text-green-400 font-bold">{keys[0].plan}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    <div className="text-[9px] font-bold text-gray-600 mb-2 mt-4 tracking-[0.2em] uppercase">Administrative_Override</div>
                                    {profile.status !== 'banned' && (
                                        <button
                                            onClick={() => onUpdate(profile.uid, 'banned', 7)}
                                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 py-4 text-[10px] font-black tracking-[0.2em] transition-all uppercase"
                                        >
                                            BAN_OPERATIVE (7_DAYS)
                                        </button>
                                    )}
                                    {profile.status === 'banned' && (
                                        <button
                                            onClick={() => onUpdate(profile.uid, 'active')}
                                            className="w-full bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 py-4 text-[10px] font-black tracking-[0.2em] transition-all uppercase"
                                        >
                                            RESTORE_ACCESS_UPLINK
                                        </button>
                                    )}
                                    {profile.status === 'pending' && (
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => onUpdate(profile.uid, 'active')}
                                                className="bg-green-500 text-black py-4 text-[10px] font-black tracking-[0.2em] hover:bg-green-400 transition-all uppercase"
                                            >
                                                APPROVE_DOSSIER
                                            </button>
                                            <button
                                                onClick={() => onUpdate(profile.uid, 'rejected')}
                                                className="bg-gray-800 text-white py-4 text-[10px] font-black tracking-[0.2em] hover:bg-gray-700 transition-all uppercase"
                                            >
                                                REJECT_ENTRY
                                            </button>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (confirm('PERMANENTLY PURGE OPERATIVE RECORDS? CORE DATA WILL BE LOST.')) {
                                                fetch(`/api/admin/users/${profile.uid}`, {
                                                    method: 'DELETE',
                                                    headers: { Authorization: `Bearer ${token}` }
                                                }).then(res => {
                                                    if (res.ok) { onUpdate(profile.uid, 'deleted'); onClose(); }
                                                    else alert('Purge failed');
                                                });
                                            }
                                        }}
                                        className="w-full text-red-700 hover:text-red-500 py-3 text-[9px] font-mono tracking-widest mt-8 border border-red-900/40 hover:border-red-500 transition-all uppercase"
                                    >
                                        // PURGE_DATABASE_INSTANCE
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main Content: Activity & Keys */}
                        <div className="lg:col-span-8 space-y-8">
                            <div className="bg-white/[0.01] p-6 border border-white/5">
                                <div className="text-gray-500 text-[9px] font-bold tracking-[0.2em] mb-6 font-mono uppercase">Activity_Telemetry_Last_7_Cycles</div>
                                <UsageChart data={history} />
                            </div>

                            <div className="bg-white/[0.01] p-6 border border-white/5">
                                <div className="text-gray-500 text-[9px] font-bold tracking-[0.2em] mb-6 font-mono uppercase">Provisioned_Access_Keys ({keys.length})</div>
                                <div className="space-y-3">
                                    {keys.map(k => (
                                        <div key={k.id} className="flex justify-between items-center bg-black/40 p-4 border border-white/5 hover:border-white/10 transition-all group/key">
                                            <div className="font-mono text-sm tracking-tight text-gray-300">
                                                <span className="text-green-500 mr-4 opacity-50 group-hover/key:opacity-100 transition-opacity">●</span>
                                                {k.key_prefix}<span className="text-gray-600">••••••••</span>
                                                <span className="ml-4 text-[10px] text-gray-500 tracking-widest uppercase font-bold">{k.name}</span>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-[10px] flex flex-col items-end">
                                                    <span className="text-gray-500 tracking-tighter">CALLS_EXCT</span>
                                                    <span className="text-white font-black">{k.usage_count}</span>
                                                </div>
                                                <span className="bg-white/5 px-2 py-1 text-[9px] font-black text-gray-400 tracking-widest border border-white/10 uppercase">{k.plan}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {keys.length === 0 && <div className="text-gray-600 italic text-[11px] font-mono tracking-widest py-4 text-center border border-dashed border-white/5">NO_KEYS_LINKED_TO_INSTANCE</div>}
                                </div>
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
    const [error, setError] = useState('');
    const [tab, setTab] = useState('active'); // 'active' | 'pending'
    const [selectedUid, setSelectedUid] = useState(null);

    const navigate = useNavigate();
    const token = localStorage.getItem('sg_dev_token');

    useEffect(() => {
        if (!token) { navigate('/admin/login'); return; }
        fetchData();
    }, [token]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const usersRes = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
            if (usersRes.status === 401 || usersRes.status === 403) { navigate('/admin/login'); return; }
            const usersData = await usersRes.json();
            setUsers(usersData.users);

            const metricsRes = await fetch('/api/admin/metrics', { headers: { Authorization: `Bearer ${token}` } });
            if (metricsRes.ok) setMetrics((await metricsRes.json()).stats);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (uid, newStatus, banDays = 0) => {
        try {
            const res = await fetch(`/api/admin/users/${uid}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus, banDurationDays: banDays })
            });
            if (!res.ok) throw new Error('Update failed');
            fetchData(); // Refresh list
            if (selectedUid === uid) setSelectedUid(null); // Close modal on critical action
        } catch (err) {
            alert(err.message);
        }
    };

    const filteredUsers = users.filter(u =>
        tab === 'pending' ? (u.status === 'pending' || u.status === 'rejected') : (u.status !== 'pending' && u.status !== 'rejected')
    );

    if (loading && !users.length) return <div className="min-h-screen bg-black text-green-500 font-mono p-8 animate-pulse">INITIALIZING ADMIN UPLINK...</div>;

    return (
        <div className="min-h-screen bg-[#020202] text-white p-8 font-mono animate-fade-in relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
            </div>

            {/* Top Bar HUD */}
            <div className="flex justify-between items-center mb-12 border-b border-white/10 pb-6 relative z-10">
                <div className="flex flex-col">
                    <div className="text-[10px] font-bold text-gray-500 tracking-[0.4em] mb-1">SYSTEM_ADMIN_UPLINK_ESTABLISHED</div>
                    <h1 className="text-3xl font-black text-white tracking-widest flex items-center gap-3">
                        SHADOWGUARD <span className="text-green-500 italic opacity-50">/</span><span className="text-green-500">ADMIN</span>
                    </h1>
                </div>
                <div className="flex items-center gap-8">
                    <div className="hidden md:flex flex-col items-end mr-4">
                        <div className="text-[9px] text-gray-500 tracking-widest font-bold">SESSION_ID</div>
                        <div className="text-[11px] text-green-400 font-mono tracking-tighter tabular-nums uppercase">SG-{token?.toString().slice(-8) || 'ERR_NO_AUTH'}</div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchData}
                            className="px-4 py-2 border border-white/10 text-[10px] font-black tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all uppercase"
                        >
                            SYNC_DATA
                        </button>
                        <button
                            onClick={() => { localStorage.removeItem('sg_dev_token'); navigate('/admin/login') }}
                            className="px-4 py-2 border border-red-500/20 text-[10px] font-black tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-all uppercase"
                        >
                            TERM_SESS
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics HUD */}
            {metrics && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 overflow-hidden">
                    {[
                        ['TOTAL_OPERATIVES', metrics.total_users, 'text-gray-400', 'USERBASE_LINK_ESTABLISHED'],
                        ['NEURAL_QUEUE', metrics.pending_users || 0, 'text-yellow-500', metrics.pending_users > 0 ? 'CRITICAL_INTERVENTION_REQD' : 'STATUS_NOMINAL'],
                        ['ACTIVE_UPLINKS', metrics.active_keys, 'text-blue-400', 'ENCRYPTION_LAYER_ACTIVE'],
                        ['TRAFFIC_THROUGHPUT', metrics.total_api_calls || 0, 'text-green-400', 'DATA_FLOW_OPTIMIZED']
                    ].map(([label, val, color, status]) => (
                        <div key={label} className="relative overflow-hidden bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all p-5 group">
                            {/* Decorative scanline */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent h-1/2 -top-full group-hover:top-full transition-all duration-1000 pointer-events-none" />

                            <div className="text-gray-500 text-[10px] font-bold tracking-[0.2em] mb-3 flex justify-between items-center">
                                {label}
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse ml-2" />
                            </div>
                            <div className={`text-4xl font-extrabold tracking-tighter ${color} mb-3 tabular-nums`}>
                                {val.toLocaleString()}
                            </div>
                            <div className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mt-auto">
                                {status}
                            </div>
                            <div className="absolute top-0 right-0 p-1 opacity-20">
                                <div className="w-12 h-12 border-t border-r border-white/20" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabs HUD */}
            <div className="flex gap-2 mb-0 overflow-x-auto no-scrollbar">
                {[
                    { id: 'active', label: 'ACTIVE_CORPS', count: users.filter(u => u.status !== 'pending' && u.status !== 'rejected').length },
                    { id: 'pending', label: 'VERIFICATION_QUEUE', count: metrics?.pending_users || 0 }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-none group relative px-8 py-4 text-[10px] font-black tracking-[0.2em] border-t border-x transition-all duration-300 ${tab === t.id ? 'bg-white/[0.05] border-white/20 text-white' : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'}`}
                    >
                        {t.label}
                        {t.count > 0 && <span className={`ml-3 px-1.5 py-0.5 rounded-full text-[9px] tabular-nums ${t.id === 'pending' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-gray-400'}`}>{t.count}</span>}
                        {tab === t.id && <div className="absolute top-0 left-0 w-full h-0.5 bg-green-500 shadow-[0_0_10px_#22c55e]" />}
                    </button>
                ))}
            </div>

            {/* User Table Data HUD */}
            <div className="bg-[#050505] border border-white/10 shadow-2xl min-h-[500px] overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                    <thead className="bg-white/[0.02] text-gray-500 text-[9px] font-black tracking-[0.3em] uppercase border-b border-white/10">
                        <tr>
                            <th className="p-6">Operative_Ident</th>
                            <th className="p-6">Access_Auth_Link</th>
                            <th className="p-6">Uplink_Status</th>
                            <th className="p-6">Global_Throughput</th>
                            <th className="p-6 text-right">Dossier_Control</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredUsers.length === 0 ? (
                            <tr><td colSpan="5" className="p-20 text-center font-mono text-gray-600 tracking-widest uppercase opacity-40">
                                // NO_RECORDS_IN_SECTOR_0
                            </td></tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.uid} className="hover:bg-white/[0.03] transition-all duration-150 group cursor-pointer" onClick={() => setSelectedUid(user.uid)}>
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center font-black text-xs text-gray-400 group-hover:bg-green-500/10 group-hover:border-green-500/30 group-hover:text-green-400 transition-all">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-black text-white group-hover:text-green-400 transition-all tracking-tight leading-none mb-1">{user.name}</div>
                                            <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">{user.company || 'INDEPENDENT'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="font-mono text-[11px] text-gray-400 group-hover:text-gray-200 transition-all">{user.email}</div>
                                </td>
                                <td className="p-6">
                                    <div className={`inline-flex items-center gap-2 text-[9px] font-black tracking-[0.2em] uppercase px-3 py-1 border ${user.status === 'active' ? 'border-green-500/30 text-green-400 bg-green-500/5' :
                                        user.status === 'pending' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5' :
                                            'border-red-500/30 text-red-500 bg-red-500/5'
                                        }`}>
                                        <span className={`w-1 h-1 rounded-full ${user.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-current'}`} />
                                        {user.status}
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="font-mono tabular-nums text-white font-black text-sm">{user.total_usage || 0} <span className="text-[9px] text-gray-600 ml-1">RX</span></div>
                                </td>
                                <td className="p-6 text-right">
                                    <span className="text-[10px] font-black tracking-widest text-gray-600 group-hover:text-green-400 transition-all underline decoration-green-500/0 hover:decoration-green-500/50 underline-offset-4">ACCESS_DOSSIER →</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Overlay HUD */}
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
