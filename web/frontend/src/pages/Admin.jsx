
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Simple Bar Chart Component
const UsageChart = ({ data }) => {
    if (!data || data.length === 0) return <div className="text-gray-500 text-xs text-center py-4">NO DATA AVAILABLE</div>;
    const max = Math.max(...data.map(d => parseInt(d.count)), 10);
    return (
        <div className="flex items-end h-32 gap-2 mt-4 pb-2 border-b border-gray-800">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center group">
                    <div
                        className="w-full bg-green-900/50 hover:bg-green-500 transition-all relative"
                        style={{ height: `${(d.count / max) * 100}%`, minHeight: '4px' }}
                    >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                            {d.count} reqs
                        </div>
                    </div>
                    <div className="text-[9px] text-gray-500 mt-1 rotate-45 origin-left translate-x-2">{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                </div>
            ))}
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

    if (!user && loading) return <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center text-green-500">ACCESSING DATABASE...</div>;
    if (!user) return null;

    const { user: profile, keys, history } = user;

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-start bg-black/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            {profile.name}
                            <span className={`text-xs px-2 py-0.5 rounded border ${profile.status === 'active' ? 'border-green-800 text-green-500 bg-green-900/20' :
                                profile.status === 'banned' ? 'border-red-800 text-red-500 bg-red-900/20' :
                                    'border-yellow-800 text-yellow-500 bg-yellow-900/20'
                                }`}>{profile.status.toUpperCase()}</span>
                        </h2>
                        <div className="text-gray-400 text-sm font-mono mt-1">{profile.email} • {profile.company || 'Individual'}</div>
                        <div className="text-gray-600 text-xs font-mono mt-1">ID: {profile.uid}</div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Stats */}
                    <div className="space-y-6">
                        <div className="bg-black/40 p-4 border border-gray-800">
                            <h3 className="text-gray-500 text-xs uppercase font-bold mb-3">Plan Usage</h3>
                            <div className="text-3xl font-mono text-white mb-1">{profile.total_usage || 0} <span className="text-sm text-gray-500">reqs</span></div>

                            {/* Simple Plan Logic Inference */}
                            {keys.length > 0 && (
                                <div className="text-xs text-green-400 mt-2">
                                    Current Plan: <span className="font-bold">{keys[0].plan.toUpperCase()}</span>
                                </div>
                            )}
                        </div>

                        <div className="bg-black/40 p-4 border border-gray-800">
                            <h3 className="text-gray-500 text-xs uppercase font-bold mb-3">Admin Actions</h3>
                            <div className="flex flex-col gap-2">
                                {profile.status !== 'banned' && (
                                    <button
                                        onClick={() => onUpdate(profile.uid, 'banned', 7)}
                                        className="bg-red-900/30 hover:bg-red-900/50 text-red-500 border border-red-900 py-2 text-xs font-bold transition-colors"
                                    >
                                        BAN USER (7 DAYS)
                                    </button>
                                )}
                                {profile.status === 'banned' && (
                                    <button
                                        onClick={() => onUpdate(profile.uid, 'active')}
                                        className="bg-green-900/30 hover:bg-green-900/50 text-green-500 border border-green-900 py-2 text-xs font-bold transition-colors"
                                    >
                                        UNBAN USER
                                    </button>
                                )}
                                {profile.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => onUpdate(profile.uid, 'active')}
                                            className="bg-green-600 hover:bg-green-500 text-black py-2 text-xs font-bold"
                                        >
                                            APPROVE ACCOUNT
                                        </button>
                                        <button
                                            onClick={() => onUpdate(profile.uid, 'rejected')}
                                            className="bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 text-xs font-bold"
                                        >
                                            REJECT
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => {
                                        if (confirm('PERMANENTLY DELETE THIS USER? THIS ACTION CANNOT BE UNDONE.')) {
                                            fetch(`/api/admin/users/${profile.uid}`, {
                                                method: 'DELETE',
                                                headers: { Authorization: `Bearer ${token}` }
                                            }).then(res => {
                                                if (res.ok) { onUpdate(profile.uid, 'deleted'); onClose(); }
                                                else alert('Deletion failed');
                                            });
                                        }
                                    }}
                                    className="bg-red-900 hover:bg-red-800 text-white py-2 text-xs font-bold mt-4 border border-red-700"
                                >
                                    ⚠ DELETE DATABASE RECORD
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Middle/Right: Graphs & Keys */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-black/40 p-4 border border-gray-800">
                            <h3 className="text-gray-500 text-xs uppercase font-bold">Traffic Volume (Last 7 Days)</h3>
                            <UsageChart data={history} />
                        </div>

                        <div className="bg-black/40 p-4 border border-gray-800">
                            <h3 className="text-gray-500 text-xs uppercase font-bold mb-4">API Keys ({keys.length})</h3>
                            <div className="space-y-2">
                                {keys.map(k => (
                                    <div key={k.id} className="flex justify-between items-center bg-gray-900 p-2 border border-gray-800 text-xs">
                                        <div className="font-mono text-gray-300">
                                            <span className="text-green-500 mr-2">●</span>
                                            {k.key_prefix}••••
                                            <span className="ml-2 text-gray-600">({k.name})</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-gray-500">{k.usage_count} calls</span>
                                            <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-400">{k.plan}</span>
                                        </div>
                                    </div>
                                ))}
                                {keys.length === 0 && <div className="text-gray-500 italic text-xs">No active keys</div>}
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
        <div className="min-h-screen bg-black text-white p-6 font-mono">
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                <h1 className="text-2xl font-bold text-green-500 tracking-wider">
                    SHADOWGUARD <span className="text-white">//</span> ADMIN
                </h1>
                <div className="flex gap-4 text-xs">
                    <button onClick={fetchData} className="text-gray-400 hover:text-white">REFRESH DATA</button>
                    <button onClick={() => { localStorage.removeItem('sg_dev_token'); navigate('/admin/login') }} className="text-red-500 hover:text-red-400">TERMINATE SESSION</button>
                </div>
            </div>

            {/* Metrics */}
            {metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        ['TOTAL USERS', metrics.total_users],
                        ['PENDING APPROVAL', metrics.pending_users || 0, 'text-yellow-500'],
                        ['ACTIVE KEYS', metrics.active_keys],
                        ['TOTAL TRAFFIC', metrics.total_api_calls || 0, 'text-green-500']
                    ].map(([label, val, color]) => (
                        <div key={label} className="bg-gray-900/50 border border-gray-800 p-4">
                            <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">{label}</div>
                            <div className={`text-2xl font-bold ${color || 'text-white'}`}>{val}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-0 border-b border-gray-800">
                <button
                    onClick={() => setTab('active')}
                    className={`px-6 py-2 text-sm font-bold border-t border-x ${tab === 'active' ? 'bg-gray-900 border-gray-700 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    ACTIVE CORPS
                </button>
                <button
                    onClick={() => setTab('pending')}
                    className={`px-6 py-2 text-sm font-bold border-t border-x relative ${tab === 'pending' ? 'bg-gray-900 border-gray-700 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                >
                    VERIFICATION QUEUE
                    {(metrics?.pending_users > 0) && <span className="ml-2 bg-yellow-600 text-black px-1.5 rounded-full text-[10px]">{metrics.pending_users}</span>}
                </button>
            </div>

            {/* User Table */}
            <div className="bg-gray-900 border border-gray-800 min-h-[400px]">
                <table className="w-full text-left text-sm">
                    <thead className="bg-black text-gray-500 text-[10px] uppercase tracking-wider">
                        <tr>
                            <th className="p-4">User / Org</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Usage</th>
                            <th className="p-4 text-right">Controls</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {filteredUsers.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-600 italic">No records found in this sector.</td></tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.uid} className="hover:bg-gray-800/50 transition-colors group cursor-pointer" onClick={() => setSelectedUid(user.uid)}>
                                <td className="p-4">
                                    <div className="font-bold text-white group-hover:text-green-400 transition-colors">{user.name}</div>
                                    <div className="text-gray-500 text-xs">{user.company || '—'}</div>
                                </td>
                                <td className="p-4 font-mono text-xs text-gray-400">{user.email}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-0.5 text-[10px] uppercase border ${user.status === 'active' ? 'border-green-900 text-green-500 bg-green-900/10' :
                                        user.status === 'pending' ? 'border-yellow-900 text-yellow-500 bg-yellow-900/10' :
                                            'border-red-900 text-red-500 bg-red-900/10'
                                        }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="p-4 font-mono text-gray-400 text-xs">
                                    {user.total_usage || 0} calls
                                </td>
                                <td className="p-4 text-right">
                                    <span className="text-gray-600 text-xs group-hover:text-white transition-colors">VIEW DETAILS →</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
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
