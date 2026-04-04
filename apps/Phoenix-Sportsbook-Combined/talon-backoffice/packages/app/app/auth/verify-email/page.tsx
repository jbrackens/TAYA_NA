'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmail } from '../../lib/api/auth-client';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMessage('No verification token provided');
      return;
    }

    const verify = async () => {
      try {
        await verifyEmail({ token });
        setState('success');
      } catch (err) {
        setState('error');
        const message = err instanceof Error ? err.message : 'Verification failed';
        setErrorMessage(message);
      }
    };

    verify();
  }, [token]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '400px',
    padding: '40px',
    backgroundColor: '#0f1225',
    border: '1px solid #1a1f3a',
    borderRadius: '8px',
    textAlign: 'center',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#e2e8f0',
    margin: '0 0 16px 0',
  };

  const messageStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#cbd5e1',
    margin: '0 0 24px 0',
    lineHeight: '1.6',
  };

  const linkStyle: React.CSSProperties = {
    display: 'inline-block',
    marginTop: '16px',
    padding: '10px 20px',
    backgroundColor: '#f97316',
    color: '#0f1225',
    border: 'none',
    borderRadius: '4px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#f87171',
    margin: '0 0 16px 0',
  };

  const spinnerStyle: React.CSSProperties = {
    display: 'inline-block',
    width: '24px',
    height: '24px',
    border: '2px solid #1a1f3a',
    borderTop: '2px solid #f97316',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={cardStyle}>
        {state === 'loading' && (
          <>
            <h1 style={titleStyle}>Verifying Email</h1>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={spinnerStyle} />
            </div>
            <p style={messageStyle}>Please wait while we verify your email address...</p>
          </>
        )}

        {state === 'success' && (
          <>
            <h1 style={titleStyle}>Email Verified!</h1>
            <p style={messageStyle}>
              Your email has been successfully verified. You can now log in to your account.
            </p>
            <Link href="/auth/login" style={linkStyle}>
              Go to Login
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 style={titleStyle}>Verification Failed</h1>
            <p style={errorStyle}>{errorMessage}</p>
            <p style={messageStyle}>
              The verification link may have expired or is invalid. Please try requesting a new verification email.
            </p>
            <Link href="/auth/login" style={linkStyle}>
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
