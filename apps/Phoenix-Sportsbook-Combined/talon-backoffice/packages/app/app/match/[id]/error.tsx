'use client';

import React, { useEffect } from 'react';
import { logger } from '../../lib/logger';

export default function MatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('MatchError', 'Match page error', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '50vh', padding: '40px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 48, marginBottom: 16, opacity: 0.6,
      }}>⚽</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>
        Match Not Available
      </h2>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, maxWidth: 400, lineHeight: 1.6 }}>
        {error.message || 'We couldn\'t load this match. It may have been removed or the server is temporarily unavailable.'}
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #f97316, #ef4444)', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Try Again
        </button>
        <a
          href="/"
          style={{
            padding: '10px 24px', borderRadius: 8, border: '1px solid #1a1f3a',
            background: 'transparent', color: '#94a3b8',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
            display: 'flex', alignItems: 'center',
          }}
        >
          Back to Home
        </a>
      </div>
    </div>
  );
}
