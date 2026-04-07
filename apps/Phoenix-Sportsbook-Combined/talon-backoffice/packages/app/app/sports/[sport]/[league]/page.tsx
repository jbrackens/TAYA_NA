'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { OddsButton } from '../../../components/OddsButton';
import { logger } from '../../../lib/logger';

interface LeaguePageProps {
  params: {
    sport: string;
    league: string;
  };
}

interface BCGameRaw {
  id: number;
  start_ts: number;
  team1_name: string;
  team2_name: string;
  type: number;
  markets_count: number;
  info?: any;
  markets: any[];
  competitionId?: string;
  competitionName?: string;
}

const SPORT_COLUMNS: Record<string, string[]> = {
  soccer: ['1X2', 'Total', 'BTTS'],
  basketball: ['Spread', 'Moneyline', 'Total'],
  football: ['Spread', 'Moneyline', 'Total'],
  'american-football': ['Spread', 'Moneyline', 'Total'],
  baseball: ['Run Line', 'Moneyline', 'Total'],
  hockey: ['Puck Line', 'Moneyline', 'Total'],
  'ice-hockey': ['Puck Line', 'Moneyline', 'Total'],
  tennis: ['Moneyline', 'Handicap', 'Total'],
  volleyball: ['Moneyline', 'Handicap', 'Total'],
  mma: ['Winner'],
  boxing: ['1X2'],
  cricket: ['Winner'],
};

function matchesAny(value: string | undefined, needles: string[]) {
  const normalized = (value || '').toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}

function isMoneylineMarket(market: any) {
  return (
    matchesAny(market?.type, ['p1xp2', 'p1p2', 'winner', 'moneyline', 'match result']) ||
    matchesAny(market?.displayKey, ['winner', 'moneyline', 'match_result', '1x2']) ||
    matchesAny(market?.name, ['match result', 'moneyline', 'winner'])
  );
}

function isHandicapMarket(market: any) {
  return (
    matchesAny(market?.type, ['handicap', 'spread', 'run line', 'puck line']) ||
    matchesAny(market?.displayKey, ['handicap', 'spread']) ||
    matchesAny(market?.name, ['handicap', 'spread', 'run line', 'puck line'])
  );
}

function isTotalMarket(market: any) {
  return (
    matchesAny(market?.type, ['total', 'overunder', 'over/under']) ||
    matchesAny(market?.displayKey, ['total', 'totals', 'over_under']) ||
    matchesAny(market?.name, ['total', 'over/under'])
  );
}

function isBttsMarket(market: any) {
  return (
    matchesAny(market?.type, ['btts', 'both team']) ||
    matchesAny(market?.displayKey, ['btts']) ||
    matchesAny(market?.name, ['both teams score', 'both team'])
  );
}

function hasLineLabel(market: any) {
  return isHandicapMarket(market) || isTotalMarket(market);
}

function getSelectionForTeam(game: BCGameRaw, market: any, side: 'home' | 'away') {
  const teamName = side === 'home' ? game.team1_name : game.team2_name;
  const typeKey = side === 'home' ? 'P1' : 'P2';
  const orderKey = side === 'home' ? 1 : 2;
  const fallbackIndex = side === 'home' ? 0 : 1;

  return (
    market?.selections?.find(
      (s: any) =>
        s?.type === typeKey ||
        s?.order === orderKey ||
        s?.name?.toLowerCase().includes(teamName.toLowerCase()),
    ) ||
    market?.selections?.[fallbackIndex] ||
    market?.selections?.[0]
  );
}

function getMarketForColumn(sport: string, colIdx: number, markets: any[]) {
  const normalizedSport = sport.toLowerCase();
  const cols = SPORT_COLUMNS[normalizedSport] || ['Spread', 'Moneyline', 'Total'];
  const colName = cols[colIdx];

  if (!colName) return null;

  switch (colName) {
    case '1X2':
      return markets.find((m) => isMoneylineMarket(m));
    case 'Moneyline':
    case 'Winner':
    case 'P1P2':
      return markets.find((m) => isMoneylineMarket(m));
    case 'Spread':
    case 'Handicap':
    case 'Run Line':
    case 'Puck Line':
      return markets.find((m) => isHandicapMarket(m));
    case 'Total':
    case 'Over/Under':
      return markets.find((m) => isTotalMarket(m));
    case 'BTTS':
      return markets.find((m) => isBttsMarket(m));
    default:
      return null;
  }
}

function LiveBadge() {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 6px',
        backgroundColor: '#7f1d1d',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: '700',
        color: '#f87171',
      }}
    >
      LIVE
    </span>
  );
}

function GameRow({ game, sport }: { game: BCGameRaw; sport: string }) {
  const isLive = game.type === 1;
  const startTime = new Date(game.start_ts * 1000);
  
  const score1 = game.info?.score1 ?? 0;
  const score2 = game.info?.score2 ?? 0;
  const gameTime = game.info?.current_game_time;

  const matchName = `${game.team1_name} vs ${game.team2_name}`;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '100px 1fr 100px 100px 100px 80px',
        alignItems: 'center',
        padding: '14px 16px',
        background: 'linear-gradient(180deg, rgba(18,23,39,0.98) 0%, rgba(12,16,29,0.98) 100%)',
        borderBottom: '1px solid #20283d',
        gap: '12px',
      }}
    >
      {/* Time/Status */}
      <div style={{ fontSize: '12px', color: '#D3D3D3' }}>
        {isLive ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <LiveBadge />
            <span style={{ color: '#f87171', fontWeight: '600' }}>{gameTime || 'In Play'}</span>
          </div>
        ) : (
          <>
            <div>{startTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
            <div style={{ fontWeight: '600', color: '#ffffff' }}>
              {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </>
        )}
      </div>

      {/* Teams & Score */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>{game.team1_name}</span>
          {isLive && <span style={{ color: '#39ff14', fontWeight: '700' }}>{score1}</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>{game.team2_name}</span>
          {isLive && <span style={{ color: '#39ff14', fontWeight: '700' }}>{score2}</span>}
        </div>
      </div>

      {/* Odds Columns */}
      {[0, 1, 2].map((colIdx) => {
        const market = getMarketForColumn(sport, colIdx, game.markets);
        if (!market || !market.selections || market.selections.length === 0) {
          return <div key={colIdx} style={{ height: '44px', backgroundColor: '#161a35', borderRadius: '6px', opacity: 0.3 }} />;
        }

        const homeSel = getSelectionForTeam(game, market, 'home');
        const awaySel = getSelectionForTeam(game, market, 'away');

        return (
          <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <OddsButton
              fixtureId={String(game.id)}
              marketId={String(market.id)}
              selectionId={String(homeSel.id)}
              odds={homeSel.price}
              matchName={matchName}
              marketName={market.name}
              selectionName={homeSel.name}
              label={hasLineLabel(market) ? String(homeSel.base ?? '') : undefined}
              subtitle={hasLineLabel(market) ? homeSel.name : undefined}
              compact
            />
            <OddsButton
              fixtureId={String(game.id)}
              marketId={String(market.id)}
              selectionId={String(awaySel.id)}
              odds={awaySel.price}
              matchName={matchName}
              marketName={market.name}
              selectionName={awaySel.name}
              label={hasLineLabel(market) ? String(awaySel.base ?? '') : undefined}
              subtitle={hasLineLabel(market) ? awaySel.name : undefined}
              compact
            />
          </div>
        );
      })}

      {/* More Markets Link */}
      <Link href={`/match/${game.id}`} style={{ textDecoration: 'none' }}>
        <div style={{ 
          fontSize: '12px', 
          color: '#39ff14', 
          fontWeight: '700', 
          textAlign: 'center',
          cursor: 'pointer',
          padding: '8px 10px',
          borderRadius: '10px',
          background: 'rgba(57,255,20,0.08)',
          border: '1px solid rgba(57,255,20,0.14)',
        }}>
          +{game.markets_count}<br/>markets →
        </div>
      </Link>
    </div>
  );
}

export default function LeaguePage({ params }: LeaguePageProps) {
  const { sport, league } = params;
  const [games, setGames] = useState<BCGameRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState(league.replace(/-/g, ' '));

  useEffect(() => {
    let cancelled = false;
    const loadEvents = async () => {
      try {
        setLoading(true);
        const url = `/api/bc/games/?competition=${encodeURIComponent(league)}&sport=${encodeURIComponent(sport)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch games: ${res.status}`);
        const data: BCGameRaw[] = await res.json();

        if (!cancelled) {
          setGames(data);
          if (data.length > 0 && data[0].competitionName) {
            setLeagueName(data[0].competitionName);
          }
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load events';
          logger.error('LeaguePage', 'Failed to load events', message);
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadEvents();
    return () => { cancelled = true; };
  }, [sport, league]);

  const liveGames = useMemo(() => games.filter(g => g.type === 1), [games]);
  const upcomingGames = useMemo(() => games.filter(g => g.type !== 1), [games]);

  const columns = SPORT_COLUMNS[sport.toLowerCase()] || ['Spread', 'Moneyline', 'Total'];

  if (loading) {
    return (
      <div style={{ padding: '24px', color: '#D3D3D3' }}>
        Loading league matches...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', color: '#f87171' }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '11px', color: '#D3D3D3', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px' }}>
          {sport.replace(/-/g, ' ')}
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', color: '#ffffff', letterSpacing: '-0.02em' }}>
          {leagueName}
        </h1>
        <p style={{ fontSize: '14px', color: '#D3D3D3' }}>
          Quick lines up front, with full market depth one click away.
        </p>
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid #1f2940', borderRadius: '16px', background: '#0f1225', boxShadow: '0 20px 40px rgba(0,0,0,0.16)' }}>
        <div style={{ minWidth: '700px' }}>
          {/* Market Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr 100px 100px 100px 80px',
              padding: '14px 16px',
              background: 'linear-gradient(180deg, #19233a 0%, #141c31 100%)',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              position: 'sticky',
              top: '0',
              zIndex: 10,
              gap: '12px',
              borderBottom: '1px solid #23314d',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#D3D3D3', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Time</div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#D3D3D3', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Event</div>
            {columns.map((col, i) => (
              <div key={i} style={{ fontSize: '11px', fontWeight: '700', color: '#D3D3D3', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.07em' }}>
                {col}
              </div>
            ))}
            <div />
          </div>

          {liveGames.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              {liveGames.map((game) => (
                <GameRow key={game.id} game={game} sport={sport} />
              ))}
            </div>
          )}

          {upcomingGames.length > 0 && (
            <div>
              {upcomingGames.map((game) => (
                <GameRow key={game.id} game={game} sport={sport} />
              ))}
            </div>
          )}
        </div>
      </div>

      {games.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#a0a0a0', backgroundColor: '#0f1225', borderRadius: '8px' }}>
          No matches currently available for this league.
        </div>
      )}
    </div>
  );
}
