import React, { useState, useRef, useEffect } from 'react';
import { authAPI } from '../api';
import { Lock, User, AlertCircle, Eye, EyeOff, Shield, Loader2 } from 'lucide-react';

export default function Login({ setAuth }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);

  const usernameRef = useRef(null);

  // Auto-focus username on mount & trigger entrance animation
  useEffect(() => {
    const savedUser = localStorage.getItem('remembered_user');
    if (savedUser) {
      setUsername(savedUser);
      setRememberMe(true);
    }
    const timer = setTimeout(() => setCardVisible(true), 50);
    usernameRef.current?.focus();
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(username, password);
      if (response.data.success) {
        if (rememberMe) {
          localStorage.setItem('remembered_user', username);
        } else {
          localStorage.removeItem('remembered_user');
        }
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
        localStorage.setItem('username', response.data.username);
        
        // Fetch full profile (role, name) from /me endpoint
        const meRes = await authAPI.getMe();
        if (meRes.data.success) {
          localStorage.setItem('name', meRes.data.name);
          setAuth({
            token: response.data.access_token,
            username: meRes.data.username,
            name: meRes.data.name,
            role: meRes.data.role
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ backgroundColor: '#F8FAFC' }}
    >
      {/* Login Card */}
      <div
        className={`w-full max-w-[420px] transition-all duration-500 ease-out ${
          cardVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Branding Header */}
        <div className="text-center mb-8">
          {/* MIT Logo Badge */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
               style={{
                 backgroundColor: '#1E40AF',
                 boxShadow: '0 4px 14px -2px rgba(30, 64, 175, 0.25)'
               }}>
            <span className="text-white text-xl font-bold tracking-wide" style={{ fontFamily: "'Inter', 'Poppins', sans-serif" }}>
              MIT
            </span>
          </div>

          <h1
            className="text-2xl font-semibold tracking-tight mb-1.5"
            style={{
              color: '#0F172A',
              fontFamily: "'Inter', 'Poppins', sans-serif"
            }}
          >
            ERP Accreditation Portal
          </h1>
          <p
            className="text-sm"
            style={{ color: '#64748B' }}
          >
            NBA / NAAC Outcome-Based Education System
          </p>
        </div>

        {/* Card */}
        <div
          className="p-8 sm:p-9"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.04), 0 4px 16px -2px rgba(0,0,0,0.06)'
          }}
        >
          {/* Section Label */}
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-4 h-4" style={{ color: '#1E40AF' }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: '#475569' }}
            >
              Faculty Authentication
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Faculty ID */}
            <div>
              <label
                htmlFor="login-faculty-id"
                className="block text-sm font-medium mb-2"
                style={{ color: '#334155' }}
              >
                Faculty ID
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="w-4 h-4" style={{ color: '#94A3B8' }} />
                </span>
                <input
                  id="login-faculty-id"
                  ref={usernameRef}
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Enter your faculty ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="block w-full pl-10 pr-4 py-2.5 text-sm transition-all duration-200 outline-none"
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    color: '#0F172A',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563EB';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#CBD5E1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-medium mb-2"
                style={{ color: '#334155' }}
              >
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4" style={{ color: '#94A3B8' }} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="block w-full pl-10 pr-11 py-2.5 text-sm transition-all duration-200 outline-none"
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    color: '#0F172A',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563EB';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#CBD5E1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors duration-150"
                  style={{ color: '#94A3B8' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#475569'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-remember"
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded transition-colors duration-150 cursor-pointer"
                  style={{
                    accentColor: '#2563EB',
                    border: '1px solid #CBD5E1',
                  }}
                />
                <span className="text-sm" style={{ color: '#475569' }}>
                  Remember me
                </span>
              </label>
              <button
                type="button"
                className="text-sm font-medium transition-colors duration-150"
                style={{ color: '#2563EB' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#1E40AF'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#2563EB'}
                onClick={() => alert('Please contact the administrator to reset your password.')}
              >
                Forgot Password?
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="flex items-start gap-2.5 p-3 text-sm"
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  color: '#DC2626',
                }}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Sign In Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                backgroundColor: loading ? '#93C5FD' : '#1E40AF',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 1px 3px 0 rgba(30, 64, 175, 0.2)',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#2563EB';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#1E40AF';
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>


          </form>
        </div>

        {/* Trust Message */}
        <div className="text-center mt-5">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Lock className="w-3 h-3" style={{ color: '#94A3B8' }} />
            <p className="text-xs" style={{ color: '#94A3B8' }}>
              Secure access for authorized faculty members only
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pt-5" style={{ borderTop: '1px solid #E2E8F0' }}>
          <p className="text-xs" style={{ color: '#94A3B8' }}>
            MIT Academy of Engineering&ensp;•&ensp;Accreditation Analytics Platform
          </p>
        </div>
      </div>
    </div>
  );
}
