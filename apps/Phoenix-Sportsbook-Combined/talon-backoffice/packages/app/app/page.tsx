'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBetslip } from './hooks/useBetslip';
import type { BetSelection } from './components/BetslipProvider';
import { useAppSelector, useAppDispatch } from './lib/store/hooks';
import { selectMovements, clearMovement } from './lib/store/marketSlice';
import { selectOddsFormat } from './lib/store/settingsSlice';
import { formatOdds } from './lib/utils/odds';
import { useAuth } from './hooks/useAuth';
import LandingPage from './components/LandingPage';

interface Selection {
  selectionId: string;
  marketId: string;
  name: string;
  odds: number;
  status: string;
}

interface Market {
  marketId: string;
  fixtureId: string;
  name: string;
  status: string;
  selections: Selection[];
}

interface Competitor {
  competitorId: string;
  name: string;
  score: number;
  qualifier: string;
}

interface Fixture {
  fixtureId: string;
  fixtureName: string;
  startTime: string;
  isLive: boolean;
  sport: { sportId: string; name: string; abbreviation: string; displayToPunters: boolean };
  tournament: { tournamentId: string; sportId: string; name: string; startTime: string };
  status: string;
  markets: Market[];
  marketsTotalCount: number;
  competitors: Record<string, Competitor>;
}

interface Sport {
  sportId: string;
  name: string;
  abbreviation: string;
  displayToPunters: boolean;
}

function getTeams(competitors: Record<string, Competitor> | undefined) {
  if (!competitors) return { home: 'TBD', away: 'TBD' };
  const home = competitors['home'] || Object.values(competitors)[0];
  const away = competitors['away'] || Object.values(competitors)[1];
  return { home: home?.name || 'TBD', away: away?.name || 'TBD' };
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return `Today, ${timeStr}`;
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${timeStr}`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${timeStr}`;
  } catch { return dateStr; }
}

export default function HomePage() {
  // Show marketing landing page for unauthenticated visitors
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <LandingPage />;
  return <AuthenticatedHome />;
}

function AuthenticatedHome() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSport, setActiveSport] = useState('all');

  // Betslip integration — providers are always mounted in layout.tsx
  const betslip = useBetslip();

  // Odds movement tracking from WebSocket market updates
  const movements = useAppSelector(selectMovements);
  const oddsFormat = useAppSelector(selectOddsFormat);
  const reduxDispatch = useAppDispatch();

  // Auto-clear movement indicators after 2s
  useEffect(() => {
    const keys = Object.keys(movements);
    if (keys.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const key of keys) {
      const age = Date.now() - movements[key].timestamp;
      const remaining = Math.max(0, 2000 - age);
      timers.push(setTimeout(() => {
        reduxDispatch(clearMovement(key));
      }, remaining));
    }
    return () => timers.forEach(clearTimeout);
  }, [movements, reduxDispatch]);

  const handleOddsClick = useCallback((
    fixture: Fixture,
    market: Market,
    selection: Selection,
  ) => {
    if (!betslip || selection.status === 'SUSPENDED') return;

    const sel: BetSelection = {
      id: `${market.marketId}-${selection.selectionId}`,
      fixtureId: fixture.fixtureId,
      marketId: market.marketId,
      selectionId: selection.selectionId,
      matchName: fixture.fixtureName || `${getTeams(fixture.competitors).home} vs ${getTeams(fixture.competitors).away}`,
      marketName: market.name || 'Match Result',
      selectionName: selection.name,
      odds: selection.odds,
    };

    // Toggle: if already in betslip, remove it; otherwise add
    const existing = betslip.selections.find(
      (s: BetSelection) => s.selectionId === selection.selectionId && s.marketId === market.marketId
    );
    if (existing) {
      betslip.removeSelection(existing.id);
    } else {
      betslip.addSelection(sel);
    }
  }, [betslip]);

  useEffect(() => {
    async function loadData() {
      try {
        const [fixturesRes, sportsRes] = await Promise.all([
          fetch('/api/v1/fixtures'),
          fetch('/api/v1/sports'),
        ]);
        if (fixturesRes.ok) {
          const data = await fixturesRes.json();
          const list = data.data || data.fixtures || data;
          setFixtures(Array.isArray(list) ? list : []);
        }
        if (sportsRes.ok) {
          const data = await sportsRes.json();
          const list = data.data || data.sports || data;
          setSports(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        setError('Could not connect to API. Is the backend running?');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredFixtures = activeSport === 'all'
    ? fixtures
    : fixtures.filter(f => f.sport?.sportId === activeSport);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .home-hero {
          background: linear-gradient(135deg, #1a1040 0%, #0f1225 50%, #0c1a2e 100%);
          border-radius: 16px; padding: 32px; margin-bottom: 28px;
          border: 1px solid #1e2243; position: relative; overflow: hidden;
        }
        .home-hero::before {
          content: ''; position: absolute; top: -50%; right: -20%; width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .home-hero h1 { font-size: 26px; font-weight: 800; color: #f8fafc; margin-bottom: 8px; letter-spacing: -0.02em; }
        .home-hero p { font-size: 15px; color: #64748b; font-weight: 400; }
        .home-hero .accent { color: #f97316; }

        /* Sport pills */
        .sport-pills { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
        .sport-pill {
          padding: 8px 18px; border-radius: 10px; font-size: 13px; font-weight: 600;
          border: 1.5px solid #1e2243; background: transparent; color: #64748b;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .sport-pill:hover { border-color: #374163; color: #94a3b8; }
        .sport-pill.active { border-color: #f97316; color: #f97316; background: rgba(249,115,22,0.06); }

        /* Section */
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .section-title { font-size: 17px; font-weight: 700; color: #f1f5f9; }
        .section-count {
          font-size: 12px; font-weight: 600; color: #64748b; background: #161a35;
          padding: 4px 10px; border-radius: 6px;
        }

        /* Fixture card */
        .fixture-card {
          background: #111328; border: 1px solid #1a1f3a; border-radius: 14px;
          padding: 0; margin-bottom: 12px; overflow: hidden; transition: border-color 0.15s;
        }
        .fixture-card:hover { border-color: #2a3158; }
        .fixture-meta {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 20px 0;
        }
        .fixture-league { font-size: 12px; font-weight: 600; color: #4a5580; text-transform: uppercase; letter-spacing: 0.05em; }
        .fixture-time { font-size: 12px; font-weight: 600; }
        .fixture-time.upcoming { color: #64748b; }
        .fixture-time.live { color: #22c55e; display: flex; align-items: center; gap: 6px; }
        .fixture-time.live::before {
          content: ''; width: 6px; height: 6px; border-radius: 50%; background: #22c55e;
          animation: pulse-live 1.5s ease-in-out infinite;
        }
        @keyframes pulse-live { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

        .fixture-teams {
          display: flex; align-items: center; justify-content: center; gap: 16px;
          padding: 16px 20px;
        }
        .team-name { font-size: 16px; font-weight: 700; color: #f1f5f9; flex: 1; }
        .team-name.home { text-align: right; }
        .team-name.away { text-align: left; }
        .vs-badge {
          font-size: 11px; font-weight: 700; color: #374163;
          background: #1a1f3a; padding: 4px 10px; border-radius: 6px;
          text-transform: uppercase; letter-spacing: 0.1em; flex-shrink: 0;
        }

        /* Odds row */
        .odds-row {
          display: flex; gap: 0; border-top: 1px solid #1a1f3a;
        }
        .odds-btn {
          flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 14px 12px; background: transparent; border: none; border-right: 1px solid #1a1f3a;
          cursor: pointer; transition: all 0.12s; color: #e2e8f0;
        }
        .odds-btn:last-child { border-right: none; }
        .odds-btn:hover { background: rgba(249,115,22,0.06); }
        .odds-btn:disabled { cursor: default; opacity: 0.5; }
        .odds-btn:disabled:hover { background: transparent; }
        .odds-btn.selected { background: rgba(249,115,22,0.12); border-bottom: 2px solid #f97316; }
        .odds-btn.selected .odds-label { color: #f97316; }
        .odds-btn .odds-label { font-size: 10px; font-weight: 600; color: #4a5580; text-transform: uppercase; letter-spacing: 0.05em; }
        .odds-btn .odds-value { font-size: 15px; font-weight: 700; color: #f97316; }
        .odds-btn .odds-value.suspended { color: #374163; }

        /* Odds movement flash indicators */
        .odds-btn.odds-flash-up {
          animation: flashGreen 2s ease-out;
        }
        .odds-btn.odds-flash-down {
          animation: flashRed 2s ease-out;
        }
        @keyframes flashGreen {
          0% { background: rgba(34,197,94,0.25); }
          30% { background: rgba(34,197,94,0.12); }
          100% { background: transparent; }
        }
        @keyframes flashRed {
          0% { background: rgba(239,68,68,0.25); }
          30% { background: rgba(239,68,68,0.12); }
          100% { background: transparent; }
        }
        .odds-arrow { font-size: 9px; margin-left: 3px; vertical-align: middle; }
        .odds-arrow.up { color: #22c55e; }
        .odds-arrow.down { color: #ef4444; }
        .odds-btn.odds-flash-up .odds-value { color: #22c55e; transition: color 2s; }
        .odds-btn.odds-flash-down .odds-value { color: #ef4444; transition: color 2s; }

        /* More markets link */
        .more-markets {
          display: block; text-align: center; padding: 10px; font-size: 12px;
          font-weight: 600; color: #4a5580; border-top: 1px solid #1a1f3a; transition: color 0.15s;
        }
        .more-markets:hover { color: #f97316; }

        /* Empty / error */
        .empty-state {
          text-align: center; padding: 60px 20px; color: #374163;
        }
        .empty-state .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.3; }
        .empty-state .empty-title { font-size: 16px; font-weight: 600; color: #4a5580; margin-bottom: 6px; }
        .empty-state .empty-sub { font-size: 13px; color: #374163; }

        .error-banner {
          padding: 14px 18px; background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15);
          border-radius: 12px; color: #f87171; font-size: 13px; font-weight: 500; margin-bottom: 20px;
        }

        .skeleton { background: linear-gradient(90deg, #161a35 25%, #1e2243 50%, #161a35 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 10px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}} />

      {/* Hero */}
      <div className="home-hero">
        <h1>Welcome to <span className="accent">Phoenix</span></h1>
        <p>Live odds, instant bets, real-time results.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Sport pills */}
      <div className="sport-pills">
        <button
          className={`sport-pill ${activeSport === 'all' ? 'active' : ''}`}
          onClick={() => setActiveSport('all')}
        >
          All Sports
        </button>
        {sports.map((sport) => (
          <button
            key={sport.sportId}
            className={`sport-pill ${activeSport === sport.sportId ? 'active' : ''}`}
            onClick={() => setActiveSport(sport.sportId)}
          >
            {sport.name}
          </button>
        ))}
      </div>

      {/* Fixtures */}
      <div className="section-header">
        <span className="section-title">
          {loading ? 'Loading...' : 'Upcoming Matches'}
        </span>
        {!loading && <span className="section-count">{filteredFixtures.length} matches</span>}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={`skeleton-${i}`} className="skeleton" style={{ height: 140 }} />
          ))}
        </div>
      )}

      {!loading && filteredFixtures.map((fixture) => {
        const teams = getTeams(fixture.competitors);
        const mainMarket = fixture.markets?.[0];
        return (
          <div key={fixture.fixtureId} className="fixture-card">
            <div className="fixture-meta">
              <span className="fixture-league">
                {fixture.sport?.name} &middot; {fixture.tournament?.name}
              </span>
              <span className={`fixture-time ${fixture.isLive ? 'live' : 'upcoming'}`}>
                {fixture.isLive ? 'LIVE' : formatDate(fixture.startTime)}
              </span>
            </div>

            <div className="fixture-teams">
              <span className="team-name home">{teams.home}</span>
              <span className="vs-badge">vs</span>
              <span className="team-name away">{teams.away}</span>
            </div>

            {mainMarket && mainMarket.selections?.length > 0 && (
              <div className="odds-row">
                {mainMarket.selections.map((sel) => {
                  const isSelected = betslip?.selections?.some(
                    (s: BetSelection) => s.selectionId === sel.selectionId && s.marketId === mainMarket.marketId
                  );
                  const moveKey = `${mainMarket.marketId}:${sel.selectionId}`;
                  const movement = movements[moveKey];
                  const moveClass = movement
                    ? movement.direction === 'up' ? 'odds-flash-up' : 'odds-flash-down'
                    : '';
                  return (
                    <button
                      key={sel.selectionId}
                      className={`odds-btn ${isSelected ? 'selected' : ''} ${moveClass}`}
                      onClick={() => handleOddsClick(fixture, mainMarket, sel)}
                      disabled={sel.status === 'SUSPENDED'}
                    >
                      <span className="odds-label">{sel.name}</span>
                      <span className={`odds-value ${sel.status === 'SUSPENDED' ? 'suspended' : ''}`}>
                        {sel.status === 'SUSPENDED' ? '-' : formatOdds(sel.odds, oddsFormat)}
                        {movement && movement.direction === 'up' && <span className="odds-arrow up">&#9650;</span>}
                        {movement && movement.direction === 'down' && <span className="odds-arrow down">&#9660;</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {fixture.marketsTotalCount > 1 && (
              <a href={`/fixtures/${fixture.fixtureId}`} className="more-markets">
                +{fixture.marketsTotalCount - 1} more markets
              </a>
            )}
          </div>
        );
      })}

      {!loading && filteredFixtures.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">⚽</div>
          <div className="empty-title">No matches available</div>
          <div className="empty-sub">Check back soon for upcoming fixtures and live odds.</div>
        </div>
      )}
    </>
  );
}
