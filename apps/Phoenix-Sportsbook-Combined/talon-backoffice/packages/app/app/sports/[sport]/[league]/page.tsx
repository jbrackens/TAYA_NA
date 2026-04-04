'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Event } from '../../../lib/api/events-client';
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
  sportName?: string;
  sportAlias?: string;
  competitionName?: string;
  regionName?: string;
}

function bcGameToEvent(g: BCGameRaw): Event {
  return {
    eventId: String(g.id),
    fixtureId: String(g.id),
    sportId: '',
    leagueId: '',
    homeTeam: g.team1_name || 'TBD',
    awayTeam: g.team2_name || 'TBD',
    sportKey: g.sportAlias || '',
    leagueKey: g.competitionName || '',
    startTime: new Date(g.start_ts * 1000).toISOString(),
    status: g.type === 1 ? 'live' : 'upcoming',
    hasMarkets: (g.markets_count || 0) > 0,
  };
}

function LiveBadge() {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 8px',
        backgroundColor: '#7f1d1d',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '600',
        color: '#f87171',
      }}
    >
      LIVE
    </span>
  );
}

function EventCard({ event }: { event: Event }) {
  const isLive = event.status === 'in_play' || event.status === 'live';
  return (
    <Link href={`/match/${event.eventId}`} style={{ textDecoration: 'none' }}>
      <div
        style={{
          padding: '16px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'block',
          backgroundColor: '#0f1225',
          border: '1px solid #1a1f3a',
          borderRadius: '8px',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'translateX(4px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.3)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'none';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', color: '#a0a0a0' }}>
            {new Date(event.startTime).toLocaleDateString()} {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isLive && <LiveBadge />}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#ffffff' }}>
              {event.homeTeam}
            </p>
          </div>

          <div style={{ fontSize: '11px', color: '#a0a0a0', textAlign: 'center' }}>
            vs
          </div>

          <div style={{ flex: 1, textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#ffffff' }}>
              {event.awayTeam}
            </p>
          </div>
        </div>

        {event.hasMarkets && (
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Markets available
          </div>
        )}
      </div>
    </Link>
  );
}

export default function LeaguePage({ params }: LeaguePageProps) {
  const { sport, league } = params;
  const [liveEvents, setLiveEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState(league.replace(/-/g, ' '));

  useEffect(() => {
    let cancelled = false;
    const loadEvents = async () => {
      try {
        setLoading(true);

        // Load sports to populate the BC alias cache, then resolve the alias
        const sportsRes = await fetch('/api/bc/sports/');
        const sportsData: Array<{ alias: string; name: string }> = sportsRes.ok ? await sportsRes.json() : [];
        // Find the BC alias for this sport key
        const sportEntry = sportsData.find((s) => {
          const norm = (s.alias || s.name).toLowerCase().replace(/\s+/g, '-');
          return norm === sport || s.alias?.toLowerCase() === sport;
        });
        const bcAlias = sportEntry?.alias || sport;

        // Fetch games for this specific competition from the BC games proxy
        const url = `/api/bc/games/?sport=${encodeURIComponent(bcAlias)}&competition=${encodeURIComponent(league)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch games: ${res.status}`);
        const games: BCGameRaw[] = await res.json();

        if (!cancelled) {
          const live = games.filter((g) => g.type === 1).map(bcGameToEvent);
          const upcoming = games.filter((g) => g.type !== 1).map(bcGameToEvent);
          setLiveEvents(live);
          setUpcomingEvents(upcoming);

          // Use competition name from response if available
          if (games.length > 0 && (games[0] as Record<string, unknown>).competitionName) {
            setLeagueName(String((games[0] as Record<string, unknown>).competitionName));
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

  if (loading) {
    return (
      <div style={{ padding: '24px', color: '#64748b' }}>
        Loading events...
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
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '24px', color: '#ffffff' }}>
        {leagueName}
      </h1>

      {liveEvents.length > 0 && (
        <>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '24px 0 16px 0', color: '#ffffff' }}>
            Live Matches
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {liveEvents.map((event: Event) => (
              <EventCard key={event.eventId} event={event} />
            ))}
          </div>
        </>
      )}

      {upcomingEvents.length > 0 && (
        <>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '24px 0 16px 0', color: '#ffffff' }}>
            Upcoming Matches
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingEvents.map((event: Event) => (
              <EventCard key={event.eventId} event={event} />
            ))}
          </div>
        </>
      )}

      {liveEvents.length === 0 && upcomingEvents.length === 0 && (
        <p style={{ color: '#64748b' }}>No fixtures available for this league</p>
      )}
    </div>
  );
}
