
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

            // Basic role check (client-side only, real check on backend)
            // We assume if they are login into admin, they are admin. 
            // Routes /admin/* will verify token/role.
            localStorage.setItem('sg_dev_token', data.token);
            navigate('/admin');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white font-mono flex flex-col items-center justify-center p-4 relative overflow-hidden animate-fade-in">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 blur-[150px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]" />
            </div>

            <div className="w-full max-w-md border border-white/10 bg-white/[0.02] p-10 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative group">
                {/* HUD Accents */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-500/30 group-hover:border-green-500 transition-all duration-700" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-500/30 group-hover:border-green-500 transition-all duration-700" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-500/30 group-hover:border-green-500 transition-all duration-700" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-500/30 group-hover:border-green-500 transition-all duration-700" />

                <div className="text-[10px] font-bold text-gray-500 tracking-[0.4em] mb-4 text-center uppercase">Secure_Administrative_Interface</div>

                <h1 className="text-3xl font-black mb-2 text-center tracking-widest text-white decoration-green-500/50 underline-offset-8">
                    SHADOWGUARD<span className="text-green-500">.CORE</span>
                </h1>
                <p className="text-gray-500 text-[10px] text-center mb-10 uppercase tracking-[0.2em] font-bold">
                    // Access_Limited_To_Level_4_Operatives
                </p>

                {error && (
                    <div className="mb-8 p-4 border border-red-500/20 bg-red-500/10 text-red-400 text-[11px] font-bold tracking-tight animate-shake flex items-center gap-3">
                        <span className="bg-red-500 text-black px-1.5 py-0.5 text-[9px]">ERR</span>
                        AUTH_FAILURE: {error.toUpperCase().replace(/ /g, '_')}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <label className="block text-[10px] uppercase font-black text-gray-500 mb-3 tracking-widest">Operator_Ident</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 p-4 text-sm focus:border-green-500/50 focus:outline-none transition-all text-white font-mono placeholder:text-gray-700"
                            placeholder="admin@shadowguard.local"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase font-black text-gray-500 mb-3 tracking-widest">Auth_Credentials</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 p-4 text-sm focus:border-green-500/50 focus:outline-none transition-all text-white font-mono placeholder:text-gray-700"
                            placeholder="••••••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 font-black text-[11px] tracking-[0.3em] transition-all duration-300 uppercase
                            ${loading ? 'bg-white/5 text-gray-500 cursor-wait border border-white/10' : 'bg-green-600 hover:bg-green-500 text-black shadow-[0_0_30px_rgba(34,197,94,0.2)] hover:shadow-[0_0_40px_rgba(34,197,94,0.4)]'}
                        `}
                    >
                        {loading ? 'ESTABLISHING_LINK...' : 'INITIATE_UPLINK'}
                    </button>
                </form>

                <div className="mt-12 pt-6 border-t border-white/5 text-center text-[9px] text-gray-600 font-mono tracking-widest flex justify-between uppercase">
                    <span>Node_ID: SG-2026-X</span>
                    <span className="text-green-500/40">Secure_Connection_Active</span>
                </div>
            </div>

            {/* Footer Info */}
            <div className="mt-8 text-[10px] text-gray-750 font-mono tracking-tighter opacity-30 uppercase pointer-events-none">
                ShadowGuard © 2026 // Decentralized_Security_Infrastructure // v2.4.1
            </div>
        </div>
    );
}
