'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getBalance, Balance } from '../lib/api/wallet-client';
import { Spinner } from './Spinner';

interface CurrentBalanceProps {
  compact?: boolean;
}

export default function CurrentBalance({ compact = false }: CurrentBalanceProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchBalance = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getBalance(user.id);
        setBalance(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load balance';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [user?.id]);

  const formatCurrency = (amount: number): string => {
    // wallet-client already converts cents→dollars, so amount is in dollars
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Spinner size={compact ? 14 : 18} color="#64748b" />
    );
  }

  if (error) {
    return (
      <div style={{ color: '#f87171', fontSize: compact ? '13px' : '14px' }}>
        {error}
      </div>
    );
  }

  if (!balance) {
    return null;
  }

  const availableAmount = formatCurrency(balance.availableBalance);
  const pendingAmount = formatCurrency(balance.reservedBalance);

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#64748b', fontSize: '12px' }}>Balance:</span>
        <span style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '13px' }}>
          {availableAmount}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: '#0a0e18',
        border: '1px solid #1a1f3a',
        borderRadius: '4px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Available Balance</span>
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#e2e8f0' }}>
            {availableAmount}
          </span>
        </div>
        {balance.reservedBalance > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Pending Balance</span>
            <span style={{ fontSize: '14px', color: '#cbd5e1' }}>
              {pendingAmount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
