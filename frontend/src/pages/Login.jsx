import React, { useState } from 'react';
import { authAPI } from '../api';
import { Lock, User, AlertCircle, Sparkles } from 'lucide-react';

export default function Login({ setAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(username, password);
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('username', response.data.username);
        localStorage.setItem('name', response.data.name);
        setAuth({
          token: response.data.token,
          username: response.data.username,
          name: response.data.name
        });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-950 to-indigo-950 px-4 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl -top-60 -left-60" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-3xl -bottom-40 -right-40" />

      <div className="w-full max-w-md z-10">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex w-fit px-4 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 items-center justify-center text-white text-2xl font-black shadow-xl shadow-blue-500/20 mb-4 ring-4 ring-blue-500/10">
            MIT
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-sans">
            ERP Accreditations
          </h2>
          <p className="text-slate-400 text-sm mt-1.5">
            NBA / NAAC Outcome-Based Education Analytics
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6 bg-slate-800/40 border border-slate-700/30 px-4 py-2.5 rounded-xl text-xs text-blue-400 font-medium w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            OBE Intelligence Engine Active
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Faculty Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. faculty"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Secret Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="e.g. faculty123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-rose-950/30 border border-rose-900/50 rounded-xl p-3.5 text-xs text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 text-sm shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? 'Verifying credentials...' : 'Enter ERP Workspace'}
            </button>
          </form>
        </div>

        {/* Credentials Tip */}
        <div className="text-center mt-6">
          <p className="text-slate-600 text-xs">
            Faculty Access: <code className="text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded">faculty</code> / <code className="text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded">faculty123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
