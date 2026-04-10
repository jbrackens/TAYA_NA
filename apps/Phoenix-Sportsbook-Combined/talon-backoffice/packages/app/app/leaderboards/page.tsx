'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getLeaderboards, type LeaderboardDefinition } from '../lib/api/leaderboards-client';

const METRIC_LABELS: Record<string, string> = {
  net_profit_cents: 'Net Profit',
  stake_cents: 'Total Stake',
  win_count: 'Wins',
  bet_count: 'Total Bets',
  referral_count: 'Referrals',
};

const MODE_LABELS: Record<string, string> = {
  SUM: 'Sum',
  COUNT: 'Count',
  MAX: 'Best',
  AVG: 'Average',
};

const ORDER_LABELS: Record<string, string> = {
  DESC: 'Highest First',
  ASC: 'Lowest First',
};

function humanize(key: string, map: Record<string, string>): string {
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LeaderboardsPage() {
  const [items, setItems] = useState<LeaderboardDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const nextItems = await getLeaderboards();
        setItems(nextItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboards');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const featured = useMemo(() => items.slice(0, 2), [items]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      <div className="leaderboards-page">
        <section className="leaderboards-hero">
          <div>
            <div className="leaderboards-kicker">Competition Hub</div>
            <h1>TAYA NA! Leaderboards</h1>
            <p>
              Track the sharpest staking runs and hottest profit streaks across the book.
            </p>
          </div>
          <div className="leaderboards-hero-badge">
            <span>{items.length}</span>
            Active boards
          </div>
        </section>

        {featured.length > 0 ? (
          <section className="leaderboards-featured">
            {featured.map((board) => (
              <Link key={board.leaderboardId} href={`/leaderboards/${board.leaderboardId}`} className="leaderboards-feature-card">
                <div className="leaderboards-status">{board.status.toUpperCase()}</div>
                <h2>{board.name}</h2>
                <p>{board.description || 'Live competition board with real-time sportsbook ranking.'}</p>
                <div className="leaderboards-meta">
                  <span>{humanize(board.rankingMode, MODE_LABELS)}</span>
                  <span>{humanize(board.order, ORDER_LABELS)}</span>
                  <span>{humanize(board.metricKey, METRIC_LABELS)}</span>
                </div>
              </Link>
            ))}
          </section>
        ) : null}

        <section className="leaderboards-list-shell">
          <div className="leaderboards-section-head">
            <h2>All Boards</h2>
            <span>{items.length} live competitions</span>
          </div>

          {error ? (
            <div className="leaderboards-state">{error}</div>
          ) : isLoading ? (
            <div className="leaderboards-state">Loading leaderboard action...</div>
          ) : items.length ? (
            <div className="leaderboards-list">
              {items.map((board) => (
                <Link key={board.leaderboardId} href={`/leaderboards/${board.leaderboardId}`} className="leaderboards-row">
                  <div>
                    <div className="leaderboards-row-title">{board.name}</div>
                    <div className="leaderboards-row-copy">
                      {board.description || board.prizeSummary || 'Sportsbook competition board'}
                    </div>
                  </div>
                  <div className="leaderboards-row-metric">{humanize(board.metricKey, METRIC_LABELS)}</div>
                  <div className="leaderboards-row-mode">
                    {humanize(board.rankingMode, MODE_LABELS)} · {humanize(board.order, ORDER_LABELS)}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="leaderboards-state">No leaderboards are live right now.</div>
          )}
        </section>
      </div>
    </>
  );
}

const pageStyles = `
  .leaderboards-page {
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 22px;
    color: #f8fafc;
  }
  .leaderboards-hero,
  .leaderboards-list-shell,
  .leaderboards-feature-card {
    background: linear-gradient(180deg, rgba(17, 23, 43, 0.94), rgba(8, 13, 28, 0.98));
    border: 1px solid rgba(46, 214, 0, 0.18);
    border-radius: 24px;
    box-shadow: 0 24px 60px rgba(2, 6, 23, 0.36);
  }
  .leaderboards-hero {
    padding: 28px;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: flex-end;
  }
  .leaderboards-kicker {
    color: #39ff14;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .leaderboards-hero h1 {
    margin: 0 0 10px;
    font-size: 34px;
    line-height: 1.05;
  }
  .leaderboards-hero p {
    margin: 0;
    max-width: 640px;
    color: #d3d3d3;
    font-size: 15px;
  }
  .leaderboards-hero-badge {
    min-width: 140px;
    padding: 16px 18px;
    border-radius: 18px;
    background: rgba(57, 255, 20, 0.08);
    border: 1px solid rgba(57, 255, 20, 0.18);
    color: #d3d3d3;
    text-align: right;
    font-size: 13px;
  }
  .leaderboards-hero-badge span {
    display: block;
    color: #ffffff;
    font-size: 34px;
    font-weight: 800;
    line-height: 1;
    margin-bottom: 6px;
  }
  .leaderboards-featured {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 18px;
  }
  .leaderboards-feature-card {
    padding: 22px;
    text-decoration: none;
    color: inherit;
    transition: transform 160ms ease, border-color 160ms ease;
  }
  .leaderboards-feature-card:hover {
    transform: translateY(-2px);
    border-color: rgba(57, 255, 20, 0.34);
  }
  .leaderboards-status {
    display: inline-flex;
    align-items: center;
    padding: 5px 10px;
    border-radius: 999px;
    background: rgba(57, 255, 20, 0.12);
    color: #39ff14;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    margin-bottom: 14px;
  }
  .leaderboards-feature-card h2 {
    margin: 0 0 10px;
    font-size: 22px;
  }
  .leaderboards-feature-card p {
    margin: 0 0 16px;
    color: #d3d3d3;
    line-height: 1.5;
  }
  .leaderboards-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .leaderboards-meta span {
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.12);
    color: #d3d3d3;
    font-size: 12px;
  }
  .leaderboards-list-shell {
    padding: 24px;
  }
  .leaderboards-section-head {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: baseline;
    margin-bottom: 18px;
  }
  .leaderboards-section-head h2 {
    margin: 0;
    font-size: 22px;
  }
  .leaderboards-section-head span {
    color: #d3d3d3;
    font-size: 13px;
  }
  .leaderboards-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .leaderboards-row {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(120px, 0.8fr) minmax(140px, 0.8fr);
    gap: 14px;
    align-items: center;
    padding: 16px 18px;
    border-radius: 16px;
    background: rgba(8, 13, 28, 0.72);
    border: 1px solid rgba(148, 163, 184, 0.12);
    text-decoration: none;
    color: inherit;
  }
  .leaderboards-row-title {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .leaderboards-row-copy,
  .leaderboards-row-metric,
  .leaderboards-row-mode,
  .leaderboards-state {
    color: #d3d3d3;
    font-size: 13px;
  }
  .leaderboards-state {
    padding: 14px 0 4px;
  }
  @media (max-width: 900px) {
    .leaderboards-page {
      padding: 18px;
    }
    .leaderboards-hero {
      flex-direction: column;
      align-items: flex-start;
    }
    .leaderboards-hero-badge {
      text-align: left;
    }
    .leaderboards-row {
      grid-template-columns: 1fr;
    }
  }
`;
