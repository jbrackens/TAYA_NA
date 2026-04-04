'use client';

import { useEffect, useState } from 'react';
import SportSidebar from '../components/SportSidebar';
import FeaturedMatches from '../components/FeaturedMatches';
import { getSports } from '../lib/api/events-client';
import type { Sport } from '../lib/api/events-client';

const ESPORTS_KEYS = ['esports', 'csgo', 'dota2', 'lol', 'valorant', 'overwatch', 'starcraft', 'rocket-league'];

export default function EsportsBetsPage() {
  const [esportsSports, setEsportsSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const sports = await getSports();
        if (!cancelled) {
          const filtered = sports.filter((s: Sport) =>
            ESPORTS_KEYS.some((key) => s.sportKey.toLowerCase().includes(key))
          );
          setEsportsSports(filtered);
        }
      } catch {
        // Falls back to empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#ffffff' }}>
        Esports Betting
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
        Bet on CS:GO, Dota 2, League of Legends, Valorant, and more
      </p>

      {loading ? (
        <div style={{ color: '#64748b' }}>Loading esports...</div>
      ) : esportsSports.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {esportsSports.map((sport: Sport) => (
            <div key={sport.sportKey}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px' }}>
                {sport.sportName}
              </h2>
              <FeaturedMatches sportKey={sport.sportKey} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            No esports events currently available. Check back soon!
          </p>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#e2e8f0' }}>
            Browse All Sports
          </h2>
          <SportSidebar />
        </div>
      )}
    </div>
  );
}
