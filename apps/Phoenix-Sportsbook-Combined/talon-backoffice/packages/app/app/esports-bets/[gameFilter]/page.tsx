'use client';

import { useEffect, useState } from 'react';
import { LoadingState } from '../../components/Spinner';
import LeagueNav from '../../components/LeagueNav';
import FixtureList from '../../components/FixtureList';

interface EsportsGamePageProps {
  params: Promise<{
    gameFilter: string;
  }>;
}

export default function EsportsGamePage({ params }: EsportsGamePageProps) {
  const [gameFilter, setGameFilter] = useState<string>('');
  const [selectedLeague, setSelectedLeague] = useState<string>('');

  useEffect(() => {
    const loadParams = async () => {
      const { gameFilter: gf } = await params;
      setGameFilter(gf);
    };
    loadParams();
  }, [params]);

  if (!gameFilter) {
    return <LoadingState />;
  }

  const gameName = gameFilter
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#ffffff' }}>
        {gameName} Esports
      </h1>
      <LeagueNav sportKey={gameFilter} onLeagueSelect={setSelectedLeague} />
      <FixtureList sportKey={gameFilter} leagueKey={selectedLeague || undefined} />
    </div>
  );
}
