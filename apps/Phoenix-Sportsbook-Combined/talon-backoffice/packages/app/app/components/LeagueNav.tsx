'use client';

import React, { useEffect, useState } from 'react';
import { getLeagues } from '../lib/api/events-client';
import type { League } from '../lib/api/events-client';

interface LeagueNavProps {
  sportKey: string;
  onLeagueSelect?: (leagueKey: string) => void;
  activeLeague?: string;
}

export const LeagueNav: React.FC<LeagueNavProps> = ({
  sportKey,
  onLeagueSelect,
  activeLeague,
}) => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadLeagues = async () => {
      try {
        setLoading(true);
        const data = await getLeagues(sportKey);
        if (!cancelled) {
          setLeagues(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load leagues';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadLeagues();
    return () => { cancelled = true; };
  }, [sportKey]);

  const navContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    padding: '12px 0',
    marginBottom: '16px',
    scrollBehavior: 'smooth',
  };

  const scrollbarStyle = `
    @supports selector(::-webkit-scrollbar) {
      div::-webkit-scrollbar {
        height: 4px;
      }
      div::-webkit-scrollbar-track {
        background: transparent;
      }
      div::-webkit-scrollbar-thumb {
        background: #1a1f3a;
        border-radius: 4px;
      }
    }
  `;

  if (loading) {
    return (
      <div style={{ ...navContainerStyle, color: '#64748b' }}>
        Loading leagues...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...navContainerStyle, color: '#f87171' }}>
        Error: {error}
      </div>
    );
  }

  if (leagues.length === 0) {
    return (
      <div style={{ ...navContainerStyle, color: '#64748b' }}>
        No leagues available
      </div>
    );
  }

  return (
    <>
      <style>{scrollbarStyle}</style>
      <div style={navContainerStyle}>
        {leagues.map((league: League) => {
          const isActive = activeLeague === league.leagueKey;
          const pillStyle: React.CSSProperties = {
            padding: '8px 16px',
            backgroundColor: isActive ? '#f97316' : '#0f1225',
            color: isActive ? '#000' : '#e2e8f0',
            border: `1px solid ${isActive ? '#f97316' : '#1a1f3a'}`,
            borderRadius: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            fontSize: '13px',
            fontWeight: 500,
            flexShrink: 0,
          };

          return (
            <button
              key={league.leagueKey}
              style={pillStyle}
              onClick={() => onLeagueSelect?.(league.leagueKey)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f97316';
                (e.currentTarget as HTMLButtonElement).style.color = '#000';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = isActive ? '#f97316' : '#0f1225';
                (e.currentTarget as HTMLButtonElement).style.color = isActive ? '#000' : '#e2e8f0';
              }}
            >
              {league.leagueName} ({league.eventCount})
            </button>
          );
        })}
      </div>
    </>
  );
};

export default LeagueNav;
