'use client';

import { useAuth } from '../hooks/useAuth';
import BetHistoryList from '../components/BetHistoryList';
import ProtectedRoute from '../components/ProtectedRoute';

function BetsContent() {
  const { user } = useAuth();

  return (
    <div>
      <h1 style={{
        fontSize: '28px',
        fontWeight: 700,
        marginBottom: '24px',
        color: '#ffffff',
      }}>
        My Bets
      </h1>
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
