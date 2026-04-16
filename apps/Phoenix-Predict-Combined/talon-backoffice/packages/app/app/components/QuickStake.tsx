'use client';

import React from 'react';

interface QuickStakeProps {
  onStakeSelect: (amount: number) => void;
}

const STAKE_OPTIONS = [5, 10, 25, 50, 100];

export const QuickStake: React.FC<QuickStakeProps> = ({ onStakeSelect }) => {
  const [hoveredButton, setHoveredButton] = React.useState<number | null>(null);

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
      }}
    >
      {STAKE_OPTIONS.map((amount) => (
        <button
          key={amount}
          onClick={() => onStakeSelect(amount)}
          onMouseEnter={() => setHoveredButton(amount)}
          onMouseLeave={() => setHoveredButton(null)}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor:
              hoveredButton === amount ? '#4a7eff' : '#0f3460',
            border:
              hoveredButton === amount
                ? '1px solid #4a7eff'
                : '1px solid #0f3460',
            color: hoveredButton === amount ? '#000' : '#ffffff',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            transition: 'all 0.2s',
            outline: 'none',
          }}
        >
          ${amount}
        </button>
      ))}
    </div>
  );
};

export default QuickStake;
