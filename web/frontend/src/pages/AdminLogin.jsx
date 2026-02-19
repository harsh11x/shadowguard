
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
        <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md border border-gray-800 bg-gray-900 p-8 shadow-2xl relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>

                <h1 className="text-2xl font-bold mb-2 text-center tracking-wider text-green-500">
                    SHADOWGUARD // COMMAND
                </h1>
                <p className="text-gray-500 text-xs text-center mb-8 uppercase tracking-widest">
                    Authorized Personnel Only
                </p>

                {error && (
                    <div className="mb-6 p-3 border border-red-900 bg-red-900/20 text-red-500 text-xs">
                        ⚠️ ACCESS DENIED: {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs uppercase text-gray-500 mb-2">Identity</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-black border border-gray-700 p-3 text-sm focus:border-green-500 focus:outline-none transition-colors text-white"
                            placeholder="admin@shadowguard.io"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-gray-500 mb-2">Credentials</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-black border border-gray-700 p-3 text-sm focus:border-green-500 focus:outline-none transition-colors text-white"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 font-bold text-sm tracking-wider transition-all 
                            ${loading ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]'}
                        `}
                    >
                        {loading ? 'AUTHENTICATING...' : 'INITIATE SESSION'}
                    </button>
                </form>

                <div className="mt-8 pt-4 border-t border-gray-800 text-center text-[10px] text-gray-600">
                    SYSTEM ID: SG-CORE-V2 // IP: {window.location.hostname}
                </div>
            </div>
        </div>
    );
}
