'use client';

import { useEffect, useState } from 'react';
import MatchHeader from '../../components/MatchHeader';
import MatchTimeline from '../../components/MatchTimeline';
import MarketGroup from '../../components/MarketGroup';
import { getEvent } from '../../lib/api/events-client';
import { getMarkets } from '../../lib/api/markets-client';
import type { EventDetail } from '../../lib/api/events-client';
import type { Market } from '../../lib/api/markets-client';
/* GetMarketsParams not needed — getMarkets takes a plain string */

interface MatchPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function MatchPage({ params }: MatchPageProps) {
  const [matchId, setMatchId] = useState<string>('');
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadParams = async () => {
      const { id } = await params;
      setMatchId(id);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    if (!matchId) return;

    let cancelled = false;
    const loadEventData = async () => {
      try {
        setLoading(true);

        // Fetch event details and markets in parallel
        const [eventData, marketsData] = await Promise.all([
          getEvent(matchId),
          getMarkets(matchId),
        ]);

        if (!cancelled) {
          setEvent(eventData);
          setMarkets(marketsData);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load match data';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadEventData();
    return () => { cancelled = true; };
  }, [matchId]);

  if (!matchId || loading) {
    return (
      <div style={{ padding: '40px', color: '#64748b' }}>
        Loading match data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', color: '#f87171' }}>
        Error: {error}
      </div>
    );
  }

  // Derive match status for MatchHeader
  const matchStatus: 'live' | 'upcoming' | 'finished' =
    event?.status === 'in_play' ? 'live' :
    event?.status === 'finished' || event?.status === 'settled' ? 'finished' :
    'upcoming';

  // Group markets by name/type
  const marketGroups: Record<string, Market[]> = {};
  for (const market of markets) {
    const groupName = market.marketName || 'Other Markets';
    if (!marketGroups[groupName]) {
      marketGroups[groupName] = [];
    }
    marketGroups[groupName].push(market);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <MatchHeader
        fixtureId={matchId}
        homeTeam={event?.homeTeam || 'Home'}
        awayTeam={event?.awayTeam || 'Away'}
        status={matchStatus}
      />

      {matchStatus === 'live' && (
        <MatchTimeline fixtureId={matchId} />
      )}

      {Object.keys(marketGroups).length > 0 ? (
        Object.entries(marketGroups).map(([groupName, groupMarkets]) => (
          <MarketGroup
            key={groupName}
            name={groupName}
            markets={groupMarkets}
          />
        ))
      ) : (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#64748b',
          backgroundColor: '#0f1225',
          borderRadius: '8px',
          fontSize: '14px',
        }}>
          No markets available for this match
        </div>
      )}
    </div>
  );
}
