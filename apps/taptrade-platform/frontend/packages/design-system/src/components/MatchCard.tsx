import React from 'react';
import Card from './Card';
import Badge from './Badge';
import OddsButton from './OddsButton';

interface MatchCardProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'live' | 'finished' | 'upcoming' | 'cancelled';
  homeOdds?: number;
  drawOdds?: number;
  awayOdds?: number;
  onBetHome?: () => void;
  onBetDraw?: () => void;
  onBetAway?: () => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status,
  homeOdds = 2.1,
  drawOdds = 3.2,
  awayOdds = 2.8,
  onBetHome,
  onBetDraw,
  onBetAway,
}) => {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div />
        <div className="shrink-0">
          <Badge variant={status}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="text-[14px] font-semibold leading-[20px] text-white">
            {homeTeam}
          </div>
          <div className="text-[56px] font-bold leading-[64px] text-[#f5c842]">
            {homeScore}
          </div>
        </div>
        <div className="h-[100px] w-0.5 bg-[#3d3d5c]" />
        <div className="flex flex-col items-center gap-2">
          <div className="text-[14px] font-semibold leading-[20px] text-white">
            {awayTeam}
          </div>
          <div className="text-[56px] font-bold leading-[64px] text-[#f5c842]">
            {awayScore}
          </div>
        </div>
      </div>

      {status !== 'cancelled' && (
        <div className="flex gap-2 border-t border-[#3d3d5c] pt-4">
          <OddsButton odds={homeOdds} onClick={onBetHome} />
          {drawOdds && <OddsButton odds={drawOdds} onClick={onBetDraw} />}
          <OddsButton odds={awayOdds} onClick={onBetAway} />
        </div>
      )}
    </Card>
  );
};

export default MatchCard;
