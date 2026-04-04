'use client';

import { useEffect, useState } from 'react';
import FixtureList from '../../../../components/FixtureList';
import { getLeagues } from '../../../../lib/api/events-client';
import type { League } from '../../../../lib/api/events-client';

interface EsportsCompetitionPageProps {
  params: Promise<{
    gameFilter: string;
    competitionId: string;
  }>;
}

export default function EsportsCompetitionPage({ params }: EsportsCompetitionPageProps) {
  const [gameFilter, setGameFilter] = useState<string>('');
  const [competitionId, setCompetitionId] = useState<string>('');
  const [competitionName, setCompetitionName] = useState<string>('');

  useEffect(() => {
    const loadParams = async () => {
      const { gameFilter: gf, competitionId: cid } = await params;
      setGameFilter(gf);
      setCompetitionId(cid);

      // Try to resolve competition name from leagues API
      try {
        const leagues = await getLeagues(gf);
        const match = leagues.find((l: League) => l.leagueKey === cid || l.leagueId === cid);
        if (match) {
          setCompetitionName(match.leagueName);
        } else {
          setCompetitionName(cid.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
        }
      } catch {
        setCompetitionName(cid.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
      }
    };
    loadParams();
  }, [params]);

  if (!gameFilter || !competitionId) {
    return <div style={{ color: '#64748b', padding: '40px' }}>Loading...</div>;
  }

  const gameName = gameFilter
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {gameName} Esports
        </p>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff', margin: 0 }}>
          {competitionName}
        </h1>
      </div>
      <FixtureList sportKey={gameFilter} leagueKey={competitionId} />
    </div>
  );
}
