'use client';

import React, { useState } from 'react';
import MarketRow from './MarketRow';

interface Selection {
  id: string;
  name: string;
  odds: number;
}

interface Market {
  id: string;
  name: string;
  status: string;
  selections?: Selection[];
}

interface MarketGroupProps {
  name: string;
  markets: Market[];
  onSelectMarket?: (marketId: string, selectionId: string, odds: number) => void;
}

export const MarketGroup: React.FC<MarketGroupProps> = ({
  name,
  markets,
  onSelectMarket,
}) => {
  const [expanded, setExpanded] = useState(true);

  if (markets.length === 0) {
    return null;
  }

  return (
    <div style={{
      borderBottom: '1px solid #1a1f3a',
      padding: '16px 0',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0',
          background: 'none',
          border: 'none',
          color: '#e2e8f0',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        <h3 style={{
          margin: '0',
          fontSize: '15px',
          fontWeight: '600',
          color: '#e2e8f0',
        }}>
          {name}
        </h3>
        <span style={{
          display: 'inline-block',
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          color: '#f97316',
        }}>
          ▼
        </span>
      </button>

      {expanded && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginTop: '16px',
        }}>
          {markets.map((market) => (
            <MarketRow
              key={market.id}
              market={market}
              onSelectMarket={onSelectMarket}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketGroup;
