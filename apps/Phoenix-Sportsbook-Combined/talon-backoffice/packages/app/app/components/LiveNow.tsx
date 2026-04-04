'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getSports, getEvents } from '../lib/api/events-client';
import type { Event as SportEvent, Sport } from '../lib/api/events-client';
import wsService from '../lib/websocket/websocket-service';
import type { WsMessage } from '../lib/websocket/websocket-service';

interface MatchCardProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'live' | 'finished' | 'upcoming' | 'cancelled';
  homeOdds?: number;
  drawOdds?: number;
  awayOdds?: number;
  onBetHome?: () => void;
  onBetDraw?: () => void;
  onBetAway?: () => void;
}

const InlineMatchCard: React.FC<MatchCardProps> = ({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status,
  homeOdds,
  drawOdds,
  awayOdds,
  onBetHome,
  onBetDraw,
  onBetAway,
}) => {
  const statusColors: Record<string, string> = {
    live: '#22c55e',
    finished: '#64748b',
    upcoming: '#f97316',
    cancelled: '#ef4444',
  };

  return (
    <div
      style={{
        backgroundColor: '#111328',
        border: '1px solid #1a1f3a',
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: statusColors[status] || '#64748b',
          }}
        />
        <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'capitalize' }}>
          {status}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 600 }}>
            {homeTeam}
          </div>
          <div style={{ fontSize: '20px', color: '#e2e8f0', fontWeight: 700, marginTop: '4px' }}>
            {homeScore}
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>vs</div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 600 }}>
            {awayTeam}
          </div>
          <div style={{ fontSize: '20px', color: '#e2e8f0', fontWeight: 700, marginTop: '4px' }}>
            {awayScore}
          </div>
        </div>
      </div>

      {status !== 'cancelled' && (homeOdds || drawOdds || awayOdds) && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {homeOdds && (
            <button
              onClick={onBetHome}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#1a1f3a',
                color: '#e2e8f0',
                border: '1px solid #2d3748',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Home {homeOdds.toFixed(2)}
            </button>
          )}
          {drawOdds && (
            <button
              onClick={onBetDraw}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#1a1f3a',
                color: '#e2e8f0',
                border: '1px solid #2d3748',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Draw {drawOdds.toFixed(2)}
            </button>
          )}
          {awayOdds && (
            <button
              onClick={onBetAway}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#1a1f3a',
                color: '#e2e8f0',
                border: '1px solid #2d3748',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Away {awayOdds.toFixed(2)}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface MatchWithScore extends SportEvent {
  homeScore: number;
  awayScore: number;
  sportName: string;
}

interface LiveNowProps {
  limit?: number;
}

export const LiveNow: React.FC<LiveNowProps> = ({ limit = 50 }) => {
  const [matchesByGroup, setMatchesByGroup] = useState<Record<string, MatchWithScore[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle WebSocket fixture updates
  const handleFixtureUpdate = useCallback((message: WsMessage) => {
    if (message.event !== 'update') return;
    const data = message.data;
    if (!data?.fixtureId) return;

    setMatchesByGroup((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((sport) => {
        updated[sport] = updated[sport].map((match) => {
          if (match.fixtureId === data.fixtureId) {
            return {
              ...match,
              homeScore: data.score?.home ?? match.homeScore,
              awayScore: data.score?.away ?? match.awayScore,
              status: data.status ?? match.status,
            };
          }
          return match;
        });
      });
      return updated;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLiveMatches = async () => {
      try {
        setLoading(true);

        // Load all sports, then fetch in-play events for each
        const sports = await getSports();
        const liveMatches: Record<string, MatchWithScore[]> = {};

        // Fetch live events for each sport in parallel
        const results = await Promise.allSettled(
          sports.map(async (sport: Sport) => {
            const response = await getEvents({
              sport: sport.sportKey,
              status: 'in_play',
              limit,
            });
            return { sport, events: response.events };
          })
        );

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value.events.length > 0) {
            const { sport, events } = result.value;
            liveMatches[sport.sportName] = events.map((event: SportEvent) => ({
              ...event,
              homeScore: 0,
              awayScore: 0,
              sportName: sport.sportName,
            }));
          }
        }

        if (!cancelled) {
          setMatchesByGroup(liveMatches);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load live matches';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadLiveMatches();

    // Subscribe to real-time fixture updates via the existing WebSocket singleton
    wsService.subscribe('fixture');
    const unsubscribe = wsService.on('fixture', handleFixtureUpdate);

    return () => {
      cancelled = true;
      unsubscribe();
      wsService.unsubscribe('fixture');
    };
  }, [limit, handleFixtureUpdate]);

  if (loading) {
    return <div style={{ color: '#64748b' }}>Loading live matches...</div>;
  }

  if (error) {
    return <div style={{ color: '#f87171' }}>Error: {error}</div>;
  }

  const totalMatches = Object.values(matchesByGroup).reduce((sum, matches) => sum + matches.length, 0);
  if (totalMatches === 0) {
    return <div style={{ color: '#64748b' }}>No live matches at the moment</div>;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    }}>
      {Object.entries(matchesByGroup).map(([sport, matches]) => (
        <div key={sport} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#e2e8f0',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {sport}
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}>
            {matches.map((match) => (
              <InlineMatchCard
                key={match.eventId}
                homeTeam={match.homeTeam}
                awayTeam={match.awayTeam}
                homeScore={match.homeScore}
                awayScore={match.awayScore}
                status="live"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LiveNow;
