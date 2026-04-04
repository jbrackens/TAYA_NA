'use client';

import { useState } from 'react';
import LeagueNav from '../../components/LeagueNav';
import FixtureList from '../../components/FixtureList';

interface SportPageProps {
  params: {
    sport: string;
  };
}

export default function SportPage({ params }: SportPageProps) {
  const sport = params.sport;
  const [selectedLeague, setSelectedLeague] = useState<string>('');

  const sportName = sport.charAt(0).toUpperCase() + sport.slice(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '24px', color: '#ffffff' }}>
        {sportName}
      </h1>
      <LeagueNav sportKey={sport} onLeagueSelect={setSelectedLeague} />
      {selectedLeague && (
        <FixtureList sportKey={sport} leagueKey={selectedLeague} />
      )}
    </div>
  );
}
