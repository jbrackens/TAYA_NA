'use client';

import React, { useEffect, useState } from 'react';
import BetCard from './BetCard';
import { getUserBets } from '../lib/api/betting-client';
import type { UserBet } from '../lib/api/betting-client';

interface Bet {
  betId: string;
  createdAt: string;
  status: string;
  stakeCents: number;
  odds: number;
  marketId: string;
  selectionId: string;
  settledAt?: string;
}

type BetStatus = 'all' | 'open' | 'won' | 'lost' | 'cashed_out';

interface BetHistoryListProps {
  userId: string;
  pageSize?: number;
}

export const BetHistoryList: React.FC<BetHistoryListProps> = ({
  userId,
  pageSize = 10,
}) => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [filteredBets, setFilteredBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<BetStatus>('all');

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const loadBets = async () => {
      try {
        setLoading(true);
        const userBets: UserBet[] = await getUserBets(userId);
        if (!cancelled) {
          // Normalize UserBet to local Bet shape
          const normalized: Bet[] = (userBets || []).map((ub) => ({
            betId: ub.betId,
            createdAt: ub.createdAt,
            status: ub.status,
            stakeCents: Math.round(ub.stake * 100),
            odds: ub.selection?.odds ?? 0,
            marketId: ub.selection?.marketId ?? '',
            selectionId: ub.selection?.selectionId ?? '',
            settledAt: ub.settledAt,
          }));
          setBets(normalized);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load bet history';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadBets();
    return () => { cancelled = true; };
  }, [userId]);

  // Apply filter
  useEffect(() => {
    let filtered = bets;

    if (filterStatus !== 'all') {
      filtered = bets.filter((bet) => {
        const statusMap: Record<BetStatus, string> = {
          all: 'all',
          open: 'pending',
          won: 'settled',
          lost: 'settled',
          cashed_out: 'cashed_out',
        };
        return bet.status === statusMap[filterStatus];
      });
    }

    setFilteredBets(filtered);
    setCurrentPage(1);
    setTotalPages(Math.ceil(filtered.length / pageSize));
  }, [filterStatus, bets, pageSize]);

  const paginatedBets = filteredBets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (loading) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#64748b' }}>Loading bet history...</div>;
  }

  if (error) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#f87171' }}>Error: {error}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {(['all', 'open', 'won', 'lost', 'cashed_out'] as BetStatus[]).map((status) => (
          <button
            key={status}
            style={{
              padding: '8px 16px',
              backgroundColor: filterStatus === status ? '#f97316' : '#0f1225',
              color: filterStatus === status ? '#000' : '#ffffff',
              border: `1px solid ${filterStatus === status ? '#f97316' : '#1a1f3a'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
            onClick={() => setFilterStatus(status)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f97316';
              e.currentTarget.style.color = '#000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = filterStatus === status ? '#f97316' : '#0f1225';
              e.currentTarget.style.color = filterStatus === status ? '#000' : '#ffffff';
            }}
          >
            {status === 'cashed_out' ? 'Cashed Out' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {paginatedBets.length > 0 ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {paginatedBets.map((bet) => (
              <BetCard key={bet.betId} bet={bet} />
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentPage === 1 ? '#0f1225' : '#0f1225',
                  color: '#ffffff',
                  border: `1px solid #1a1f3a`,
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.2s',
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <span style={{ color: '#64748b', alignSelf: 'center', fontSize: '13px' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentPage === totalPages ? '#0f1225' : '#0f1225',
                  color: '#ffffff',
                  border: `1px solid #1a1f3a`,
                  borderRadius: '4px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.2s',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '14px',
        }}>
          {filterStatus === 'all'
            ? 'No bets yet. Start betting to see your bet history here.'
            : `No ${filterStatus} bets`}
        </div>
      )}
    </div>
  );
};

export default BetHistoryList;
