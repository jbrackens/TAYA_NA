'use client';

import React from 'react';
import type { BetSelection } from './BetslipProvider';

interface BetLegProps {
  selection: BetSelection;
  onRemove: () => void;
}

export const BetLeg: React.FC<BetLegProps> = ({ selection, onRemove }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        backgroundColor: '#4a7eff08',
        border: '1px solid #4a7eff20',
        borderRadius: '4px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#ffffff',
            }}
          >
            {selection.matchName}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#a0a0a0',
            }}
          >
            {selection.marketName}
          </div>
        </div>
        <button
          onClick={onRemove}
          title="Remove bet"
          style={{
            background: 'none',
            border: 'none',
            color: '#f87171',
            cursor: 'pointer',
            fontSize: '18px',
            lineHeight: 1,
            padding: 0,
            transition: 'opacity 0.2s',
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '8px',
          borderTop: '1px solid #4a7eff20',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            color: '#ffffff',
            fontWeight: 500,
          }}
        >
          {selection.selectionName}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#4a7eff',
              minWidth: '45px',
              textAlign: 'right',
            }}
          >
            {selection.odds.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BetLeg;
