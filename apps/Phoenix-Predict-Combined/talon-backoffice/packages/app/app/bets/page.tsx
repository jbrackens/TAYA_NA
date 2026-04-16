'use client';

import Link from 'next/link';
import { BarChart2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import BetHistoryList from '../components/BetHistoryList';
import ProtectedRoute from '../components/ProtectedRoute';

function BetsContent() {
  const { user } = useAuth();

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#ffffff',
          margin: 0,
        }}>
          My Bets
        </h1>
        <Link
          href="/bets/analytics"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#39ff14',
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'rgba(57,255,20,0.08)',
            border: '1px solid rgba(57,255,20,0.14)',
            transition: 'all 0.2s ease',
          }}
        >
          <BarChart2 size={16} /> View Analytics
        </Link>
      </div>
      {user && <BetHistoryList userId={user.id} pageSize={10} />}
    </div>
  );
}

export default function BetsPage() {
  return (
    <ProtectedRoute>
      <BetsContent />
    </ProtectedRoute>
  );
}
