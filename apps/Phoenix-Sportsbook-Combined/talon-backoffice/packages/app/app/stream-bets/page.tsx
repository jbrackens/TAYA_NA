'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../lib/api/client';

interface Stream {
  id: string;
  title: string;
  sport: string;
  viewers: number;
  matchId?: string;
  liveNow: boolean;
}

export default function StreamBetsPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<Stream[]>('/api/v1/streams');
        setStreams(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load streams');
        setStreams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();
  }, []);

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 20px',
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '32px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '800',
    color: '#e2e8f0',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#64748b',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  };

  const cardStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#0f1225',
    border: '1px solid #1a1f3a',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    textDecoration: 'none',
    display: 'block',
    color: 'inherit',
  };

  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
    marginBottom: '12px',
  };

  const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#64748b',
  };

  const emptyTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '8px',
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Live Streams & Betting</h1>
          <p style={subtitleStyle}>Loading streams...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Live Streams & Betting</h1>
        <p style={subtitleStyle}>
          Watch live sports and place bets on your favorite matches
        </p>
      </div>

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '6px',
          color: '#fca5a5',
          marginBottom: '24px',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {streams.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={emptyTitleStyle}>No Live Streams Available</div>
          <p>Check back later for live sports and streaming opportunities.</p>
        </div>
      ) : (
        <div style={gridStyle}>
          {streams.map((stream) => (
            <Link
              key={stream.id}
              href={stream.matchId ? `/match/${stream.matchId}` : '#'}
              style={
                hoveredCard === stream.id
                  ? {
                    ...cardStyle,
                    borderColor: '#f97316',
                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.15)',
                  }
                  : cardStyle
              }
              onMouseEnter={() => setHoveredCard(stream.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={badgeStyle}>
                <span style={{ marginRight: '6px' }}>●</span> {stream.viewers.toLocaleString()} watching
              </div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#e2e8f0',
                marginBottom: '8px',
              }}>
                {stream.title}
              </h3>
              <p style={{
                fontSize: '13px',
                color: '#94a3b8',
                marginBottom: '12px',
              }}>
                {stream.sport}
              </p>
              <div style={{
                fontSize: '12px',
                color: '#64748b',
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid #1a1f3a',
              }}>
                <span>{stream.liveNow ? 'Live Now' : 'Upcoming'}</span>
                <span style={{ color: '#f97316' }}>Watch & Bet →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
