'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  getLeaderboardForUser,
  getLeaderboardEntries,
  type LeaderboardDefinition,
  type LeaderboardStanding,
} from '../../lib/api/leaderboards-client';
import { useAuth } from '../../hooks/useAuth';

export default function LeaderboardDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const leaderboardId = params?.id as string;
  const [leaderboard, setLeaderboard] = useState<LeaderboardDefinition | null>(null);
  const [items, setItems] = useState<LeaderboardStanding[]>([]);
  const [viewerEntry, setViewerEntry] = useState<LeaderboardStanding | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!leaderboardId) return;
      setIsLoading(true);
      setError(null);
      try {
        const [detail, entries] = await Promise.all([
          getLeaderboardForUser(leaderboardId, user?.id),
          getLeaderboardEntries(leaderboardId, 50, 0, user?.id),
        ]);
        setLeaderboard(detail.leaderboard);
        setItems(entries.items || []);
        setTotalCount(entries.totalCount || 0);
        setViewerEntry(entries.viewerEntry || detail.viewerEntry || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [leaderboardId, user?.id]);

  const podium = items.slice(0, 3);
  const nextPositionEntry =
    viewerEntry && viewerEntry.rank > 1
      ? items.find((entry) => entry.rank === viewerEntry.rank - 1) || null
      : null;
  const viewerGap =
    viewerEntry && nextPositionEntry
      ? Math.max(0, nextPositionEntry.score - viewerEntry.score)
      : null;
  const viewerPercentile =
    viewerEntry && totalCount > 1
      ? Math.round(((totalCount - viewerEntry.rank) / (totalCount - 1)) * 100)
      : 100;
  const viewerTopBand =
    viewerEntry && totalCount > 0 ? Math.max(1, 100 - viewerPercentile) : null;

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
                  'Track the runners setting the pace on this TAYA NA! competition board.'}
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

          {leaderboard?.windowStartsAt && leaderboard?.windowEndsAt ? (
            <div className="leaderboard-window-line">
              Competition Window: {new Date(leaderboard.windowStartsAt).toLocaleDateString()} &ndash; {new Date(leaderboard.windowEndsAt).toLocaleDateString()}
            </div>
          ) : null}

          {leaderboard?.prizeSummary ? (
            <div className="leaderboard-prize-callout">
              <div className="leaderboard-prize-kicker">Prize Pool</div>
              <div className="leaderboard-prize-text">{leaderboard.prizeSummary}</div>
            </div>
          ) : null}

          {podium.length > 0 ? (
            <div className="leaderboard-podium">
              {podium.map((entry) => (
                <div
                  key={`podium-${entry.playerId}`}
                  className={`leaderboard-podium-card leaderboard-podium-card--rank${Math.min(entry.rank, 3)}`}
                >
                  <div className="leaderboard-podium-rank">#{entry.rank}</div>
                  <div className="leaderboard-podium-player">{entry.playerId}</div>
                  <div className="leaderboard-podium-score">
                    {entry.score.toLocaleString()}
                  </div>
                  <div className="leaderboard-podium-meta">
                    {entry.eventCount} score events
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {viewerEntry ? (
            <div className={`leaderboard-viewer-card${viewerEntry.rank <= 3 ? ` leaderboard-viewer-card--rank${viewerEntry.rank}` : ''}`}>
              <div className="leaderboard-viewer-main">
                <div>
                  <div className="leaderboard-viewer-kicker">Your Position &middot; {leaderboard?.name || 'Leaderboard'}</div>
                  <div className="leaderboard-viewer-title">#{viewerEntry.rank} on this board</div>
                  <div className="leaderboard-viewer-copy">
                    {viewerEntry.eventCount} scoring events with a total of {viewerEntry.score.toLocaleString()}
                    {viewerEntry.lastEventAt
                      ? ` · Last activity: ${new Date(viewerEntry.lastEventAt).toLocaleDateString()}`
                      : ''}
                  </div>
                  <div className="leaderboard-viewer-next">
                    {viewerEntry.rank === 1
                      ? 'You are setting the pace for everyone behind you.'
                      : viewerGap !== null
                        ? `${viewerGap.toLocaleString()} points to catch #${viewerEntry.rank - 1}.`
                        : 'Keep stacking qualifying action to climb the next rung.'}
                  </div>
                </div>
                <div className="leaderboard-viewer-score-wrap">
                  <div className="leaderboard-viewer-score">{viewerEntry.score.toLocaleString()}</div>
                  <div className="leaderboard-viewer-score-meta">
                    {viewerTopBand ? `Top ${viewerTopBand}%` : 'Live on board'}
                  </div>
                </div>
              </div>
              <div className="leaderboard-viewer-stats">
                <div className="leaderboard-viewer-stat">
                  <span>Field</span>
                  <strong>{totalCount || '—'} players</strong>
                </div>
                <div className="leaderboard-viewer-stat">
                  <span>Pressure</span>
                  <strong>{viewerEntry.rank <= 3 ? 'Podium Heat' : `Chasing #${Math.max(1, viewerEntry.rank - 1)}`}</strong>
                </div>
                <div className="leaderboard-viewer-stat">
                  <span>Last Push</span>
                  <strong>
                    {viewerEntry.lastEventAt
                      ? new Date(viewerEntry.lastEventAt).toLocaleDateString()
                      : 'Waiting'}
                  </strong>
                </div>
              </div>
            </div>
          ) : user ? (
            <div className="leaderboard-detail-state">
              You are not on this ladder yet. One qualifying push gets you into the race.
            </div>
          ) : null}

          {error ? (
            <div className="leaderboard-detail-state">
              Unable to load standings right now. Try again later.
            </div>
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
              This board has not kicked into action yet.
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
  .leaderboard-window-line {
    color: #d3d3d3;
    font-size: 13px;
    margin-bottom: 14px;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .leaderboard-prize-callout {
    margin-bottom: 18px;
    padding: 16px 20px;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(57,255,20,0.08), rgba(12,18,38,0.9));
    border: 1px solid rgba(57,255,20,0.2);
  }
  .leaderboard-prize-kicker {
    color: #39ff14;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .leaderboard-prize-text {
    color: #f8fafc;
    font-size: 15px;
    line-height: 1.5;
  }
  .leaderboard-podium {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }
  .leaderboard-podium-card {
    padding: 16px;
    border-radius: 18px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: rgba(8, 13, 28, 0.78);
  }
  .leaderboard-podium-card--rank1 {
    border-color: rgba(255,215,0,0.45);
    background: linear-gradient(135deg, rgba(255,215,0,0.14), rgba(12,18,38,0.92));
  }
  .leaderboard-podium-card--rank2 {
    border-color: rgba(192,192,192,0.35);
    background: linear-gradient(135deg, rgba(192,192,192,0.12), rgba(12,18,38,0.92));
  }
  .leaderboard-podium-card--rank3 {
    border-color: rgba(205,127,50,0.35);
    background: linear-gradient(135deg, rgba(205,127,50,0.12), rgba(12,18,38,0.92));
  }
  .leaderboard-podium-rank {
    color: #39ff14;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .leaderboard-podium-player {
    color: #f8fafc;
    font-size: 18px;
    font-weight: 800;
    margin-bottom: 8px;
  }
  .leaderboard-podium-score {
    color: #ffffff;
    font-size: 26px;
    font-weight: 900;
    margin-bottom: 4px;
  }
  .leaderboard-podium-meta {
    color: #d3d3d3;
    font-size: 12px;
  }
  .leaderboard-viewer-card--rank1 {
    border-color: #ffd700;
    background: linear-gradient(135deg, rgba(255,215,0,0.12), rgba(12,18,38,0.9));
  }
  .leaderboard-viewer-card--rank2 {
    border-color: #c0c0c0;
    background: linear-gradient(135deg, rgba(192,192,192,0.1), rgba(12,18,38,0.9));
  }
  .leaderboard-viewer-card--rank3 {
    border-color: #cd7f32;
    background: linear-gradient(135deg, rgba(205,127,50,0.1), rgba(12,18,38,0.9));
  }
  .leaderboard-standings {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .leaderboard-viewer-card {
    display: flex;
    flex-direction: column;
    gap: 18px;
    margin-bottom: 18px;
    padding: 18px 20px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(57,255,20,0.1), rgba(12,18,38,0.9));
    border: 1px solid rgba(57, 255, 20, 0.22);
  }
  .leaderboard-viewer-kicker {
    color: #39ff14;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .leaderboard-viewer-title {
    color: #f8fafc;
    font-size: 20px;
    font-weight: 800;
    margin-bottom: 4px;
  }
  .leaderboard-viewer-copy {
    color: #d3d3d3;
    font-size: 13px;
  }
  .leaderboard-viewer-main {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    align-items: center;
  }
  .leaderboard-viewer-next {
    margin-top: 8px;
    color: #bfff67;
    font-size: 12px;
    font-weight: 700;
  }
  .leaderboard-viewer-score-wrap {
    display: grid;
    justify-items: end;
    gap: 6px;
  }
  .leaderboard-viewer-score {
    color: #39ff14;
    font-size: 28px;
    font-weight: 900;
  }
  .leaderboard-viewer-score-meta {
    color: #d3d3d3;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .leaderboard-viewer-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .leaderboard-viewer-stat {
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .leaderboard-viewer-stat span {
    display: block;
    color: #d3d3d3;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 6px;
  }
  .leaderboard-viewer-stat strong {
    color: #f8fafc;
    font-size: 14px;
    font-weight: 800;
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
    .leaderboard-standing-row,
    .leaderboard-viewer-main {
      flex-direction: column;
      align-items: flex-start;
    }
    .leaderboard-podium,
    .leaderboard-viewer-stats {
      grid-template-columns: 1fr;
    }
    .leaderboard-viewer-score-wrap {
      justify-items: start;
    }
    .leaderboard-standing-rank {
      width: auto;
      text-align: left;
    }
  }
`;
