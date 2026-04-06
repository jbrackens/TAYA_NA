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
  const [selectedLeague, setSelectedLeague] = useState<string>('all');

  const sportName =
    sport === 'soccer'
      ? 'Football'
      : sport
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '24px', color: '#ffffff' }}>
        {sportName}
      </h1>
      <LeagueNav
        sportKey={sport}
        activeLeague={selectedLeague}
        includeAllOption
        onLeagueSelect={setSelectedLeague}
      />
      <FixtureList
        sportKey={sport}
        leagueKey={selectedLeague === 'all' ? undefined : selectedLeague}
      />
    </div>
  );
}
