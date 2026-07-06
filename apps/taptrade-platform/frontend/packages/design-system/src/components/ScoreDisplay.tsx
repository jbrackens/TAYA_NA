import React from 'react';

interface ScoreDisplayProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
}) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col gap-1">
        <div className="text-[14px] font-semibold leading-[20px] text-white">
          {homeTeam}
        </div>
        <div className="min-w-[80px] text-center text-[56px] font-bold leading-[64px] text-[#f5c842]">
          {homeScore}
        </div>
      </div>
      <div className="h-20 w-0.5 bg-[#3d3d5c]" />
      <div className="flex flex-col gap-1">
        <div className="text-[14px] font-semibold leading-[20px] text-white">
          {awayTeam}
        </div>
        <div className="min-w-[80px] text-center text-[56px] font-bold leading-[64px] text-[#f5c842]">
          {awayScore}
        </div>
      </div>
    </div>
  );
};

export default ScoreDisplay;
