'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Login failed');
        setLoading(false);
        return;
      }

      router.push(returnUrl);
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#1a1f36',
    border: `1.5px solid ${focusedField === field ? '#6366f1' : '#2a2f4a'}`,
    borderRadius: 10,
    color: '#f1f5f9',
    fontSize: 15,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
    boxSizing: 'border-box' as const,
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'linear-gradient(135deg, #0c0e1a 0%, #131631 50%, #0c0e1a 100%)',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 420, padding: '44px 40px',
        background: '#13162b', borderRadius: 16,
        border: '1px solid #1e2243',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 120px rgba(99,102,241,0.04)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
          }}>
            <span style={{ fontSize: 24 }}>⚡</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>
            Phoenix Backoffice
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', fontWeight: 400 }}>
            Sign in to your admin account
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && (
            <div style={{
              padding: '12px 16px', background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10,
              color: '#f87171', fontSize: 13, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.02em' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="admin@phoenix.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField('')}
              style={inputStyle('email')}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.02em' }}>
                Password
              </label>
              <a href="#" style={{ fontSize: 12, color: '#6366f1', fontWeight: 500 }}>
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField('')}
              style={inputStyle('password')}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px 20px', marginTop: 4,
              background: loading ? '#4b4d8a' : 'linear-gradient(135deg, #6366f1, #7c3aed)',
              border: 'none', borderRadius: 10, color: '#fff',
              fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', opacity: loading ? 0.7 : 1,
              boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: '#475569' }}>
          Phoenix Sportsbook Admin v2.0
        </p>
      </div>
    </div>
  );
}
