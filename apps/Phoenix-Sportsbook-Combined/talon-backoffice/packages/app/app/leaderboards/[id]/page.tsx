'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  getLeaderboard,
  getLeaderboardEntries,
  type LeaderboardDefinition,
  type LeaderboardStanding,
} from '../../lib/api/leaderboards-client';

export default function LeaderboardDetailPage() {
  const params = useParams();
  const leaderboardId = params?.id as string;
  const [leaderboard, setLeaderboard] = useState<LeaderboardDefinition | null>(null);
  const [items, setItems] = useState<LeaderboardStanding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!leaderboardId) return;
      setIsLoading(true);
      setError(null);
      try {
        const [detail, entries] = await Promise.all([
          getLeaderboard(leaderboardId),
          getLeaderboardEntries(leaderboardId, 50, 0),
        ]);
        setLeaderboard(detail.leaderboard);
        setItems(entries.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [leaderboardId]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: detailStyles }} />
      <div className="leaderboard-detail-page">
        <div className="leaderboard-detail-shell">
          <div className="leaderboard-detail-head">
            <div>
              <Link href="/leaderboards" className="leaderboard-detail-back">
                Back to leaderboards
              </Link>
              <h1>{leaderboard?.name || 'Leaderboard'}</h1>
              <p>
                {leaderboard?.description ||
                  'Track the sharpest runners on this TAYA NA! competition board.'}
              </p>
            </div>
            {leaderboard ? (
              <div className="leaderboard-detail-badges">
                <span>{leaderboard.status.toUpperCase()}</span>
                <span>{leaderboard.rankingMode.toUpperCase()}</span>
                <span>{leaderboard.order.toUpperCase()}</span>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="leaderboard-detail-state">{error}</div>
          ) : isLoading ? (
            <div className="leaderboard-detail-state">Loading standings...</div>
          ) : items.length ? (
            <div className="leaderboard-standings">
              {items.map((entry) => (
                <div key={entry.playerId} className="leaderboard-standing-row">
                  <div className="leaderboard-standing-rank">#{entry.rank}</div>
                  <div className="leaderboard-standing-main">
                    <div className="leaderboard-standing-player">{entry.playerId}</div>
                    <div className="leaderboard-standing-meta">
                      {entry.eventCount} score events
                      {entry.lastEventAt
                        ? ` · last update ${new Date(entry.lastEventAt).toLocaleString()}`
                        : ''}
                    </div>
                  </div>
                  <div className="leaderboard-standing-score">
                    {entry.score.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="leaderboard-detail-state">
              No entries are ranked on this board yet.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const detailStyles = `
  .leaderboard-detail-page {
    padding: 28px;
    color: #f8fafc;
  }
  .leaderboard-detail-shell {
    background: linear-gradient(180deg, rgba(17, 23, 43, 0.94), rgba(8, 13, 28, 0.98));
    border: 1px solid rgba(46, 214, 0, 0.18);
    border-radius: 24px;
    box-shadow: 0 24px 60px rgba(2, 6, 23, 0.36);
    padding: 26px;
  }
  .leaderboard-detail-head {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: flex-start;
    margin-bottom: 22px;
  }
  .leaderboard-detail-back {
    display: inline-block;
    margin-bottom: 10px;
    color: #39ff14;
    text-decoration: none;
    font-size: 13px;
    font-weight: 700;
  }
  .leaderboard-detail-head h1 {
    margin: 0 0 10px;
    font-size: 32px;
  }
  .leaderboard-detail-head p {
    margin: 0;
    color: #d3d3d3;
    max-width: 680px;
    line-height: 1.5;
  }
  .leaderboard-detail-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .leaderboard-detail-badges span {
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(57, 255, 20, 0.1);
    border: 1px solid rgba(57, 255, 20, 0.2);
    color: #d3d3d3;
    font-size: 12px;
    font-weight: 700;
  }
  .leaderboard-standings {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .leaderboard-standing-row {
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 16px 18px;
    border-radius: 16px;
    background: rgba(8, 13, 28, 0.72);
    border: 1px solid rgba(148, 163, 184, 0.12);
  }
  .leaderboard-standing-rank {
    width: 60px;
    text-align: center;
    color: #39ff14;
    font-size: 24px;
    font-weight: 800;
  }
  .leaderboard-standing-main {
    flex: 1;
  }
  .leaderboard-standing-player {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .leaderboard-standing-meta,
  .leaderboard-detail-state {
    color: #d3d3d3;
    font-size: 13px;
  }
  .leaderboard-standing-score {
    font-size: 22px;
    font-weight: 800;
    color: #ffffff;
  }
  @media (max-width: 900px) {
    .leaderboard-detail-page {
      padding: 18px;
    }
    .leaderboard-detail-head,
    .leaderboard-standing-row {
      flex-direction: column;
      align-items: flex-start;
    }
    .leaderboard-standing-rank {
      width: auto;
      text-align: left;
    }
  }
`;
