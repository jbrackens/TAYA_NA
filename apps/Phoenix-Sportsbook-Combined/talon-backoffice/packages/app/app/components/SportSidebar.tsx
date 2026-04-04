'use client';

import React, { useEffect, useState } from 'react';
import { getSports } from '../lib/api/events-client';
import type { Sport } from '../lib/api/events-client';

interface SportSidebarProps {
  onSportSelect?: (sportKey: string) => void;
  activeSport?: string;
}

export const SportSidebar: React.FC<SportSidebarProps> = ({
  onSportSelect,
  activeSport,
}) => {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadSports = async () => {
      try {
        setLoading(true);
        const data = await getSports();
        if (!cancelled) {
          setSports(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load sports';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSports();
    return () => { cancelled = true; };
  }, []);

  const sidebarContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    backgroundColor: '#16213e',
    borderRadius: '8px',
    overflow: 'hidden',
  };

  const sidebarContainerMediaStyle = `
    @media (max-width: 768px) {
      .sidebar-container {
        flex-direction: row;
        overflow-x: auto;
        padding: 12px;
        gap: 8px;
      }
    }
  `;

  const sportItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    border: 'none',
    backgroundColor: isActive ? 'rgba(249, 115, 22, 0.125)' : 'transparent',
    color: '#e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.2s',
    borderLeft: `3px solid ${isActive ? '#f97316' : 'transparent'}`,
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: 500,
  });

  const sportItemMediaStyle = `
    @media (max-width: 768px) {
      .sport-item {
        flex: 0 0 auto;
        border-left: none;
        border-bottom: 2px solid ${activeSport ? '#f97316' : 'transparent'};
        padding: 8px 12px;
        white-space: nowrap;
      }
    }
  `;

  const sportNameStyle: React.CSSProperties = {
    flex: 1,
  };

  const badgeCountStyle: React.CSSProperties = {
    backgroundColor: '#22c55e',
    color: '#000',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 700,
    minWidth: '24px',
    textAlign: 'center',
  };

  if (loading) {
    return (
      <div style={{ ...sidebarContainerStyle, padding: '16px', color: '#64748b' }}>
        Loading sports...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...sidebarContainerStyle, padding: '16px', color: '#f87171' }}>
        Error: {error}
      </div>
    );
  }

  return (
    <>
      <style>{sidebarContainerMediaStyle}{sportItemMediaStyle}</style>
      <div style={sidebarContainerStyle} className="sidebar-container">
        {sports.map((sport: Sport) => {
          const isActive = activeSport === sport.sportKey;
          return (
            <button
              key={sport.sportKey}
              className="sport-item"
              style={sportItemStyle(isActive)}
              onClick={() => onSportSelect?.(sport.sportKey)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(249, 115, 22, 0.0625)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = isActive ? 'rgba(249, 115, 22, 0.125)' : 'transparent';
              }}
            >
              <span style={sportNameStyle}>{sport.sportName}</span>
              {sport.eventCount > 0 && <span style={badgeCountStyle}>{sport.eventCount}</span>}
            </button>
          );
        })}
      </div>
    </>
  );
};

export default SportSidebar;
