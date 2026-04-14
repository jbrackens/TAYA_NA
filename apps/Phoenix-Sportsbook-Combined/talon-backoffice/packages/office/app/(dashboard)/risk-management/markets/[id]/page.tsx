'use client';

import styled from 'styled-components';
import { Card, Badge } from '../../../../components/shared';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: #ffffff;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin: 24px 0 16px 0;
  color: #ffffff;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const InfoCard = styled(Card)`
  padding: 16px;
`;

const InfoLabel = styled.p`
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #a0a0a0;
  text-transform: uppercase;
`;

const InfoValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #4a7eff;
`;

const TableContainer = styled(Card)`
  padding: 24px;
  margin-bottom: 24px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th {
    text-align: left;
    padding: 12px;
    border-bottom: 1px solid #1a1f3a;
    font-weight: 600;
    font-size: 12px;
    color: #a0a0a0;
    text-transform: uppercase;
  }

  td {
    padding: 12px;
    border-bottom: 1px solid #1a1f3a;
    font-size: 13px;
    color: #ffffff;
  }

  tr:hover {
    background-color: rgba(74, 126, 255, 0.05);
  }
`;

interface Selection {
  id: string;
  name: string;
  odds: number;
  bets: number;
  stake: number;
  liability: number;
  exposure: number;
}

interface Market {
  id: string;
  name: string;
  fixture: string;
  sport: string;
  league: string;
  status: string;
  totalBets: number;
  totalStake: number;
  totalLiability: number;
  totalExposure: number;
  risk: number;
  selections?: Selection[];
}

export default function MarketDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMarketDetail = async () => {
      try {
        const response = await fetch(`/api/v1/admin/trading/markets/${id}`, {
          headers: {
            'X-Admin-Role': 'admin',
          },
        });
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setMarket({
          id: data.id,
          name: data.name,
          fixture: data.fixtureId || 'Unknown fixture',
          sport: 'Unknown',
          league: 'Unknown',
          status: data.status || 'unknown',
          totalBets: 0,
          totalStake: 0,
          totalLiability: 0,
          totalExposure: 0,
          risk: 0,
          selections: [],
        });
      } catch (error) {
        console.error('Failed to fetch market:', error);
        setMarket(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchMarketDetail();
    }
  }, [id]);

  if (isLoading) {
    return <div style={{ padding: '40px', color: '#a0a0a0' }}>Loading market...</div>;
  }

  if (!market) {
    return <div style={{ padding: '40px', color: '#a0a0a0' }}>Market not found</div>;
  }

  const getRiskColor = (risk: number) => {
    if (risk > 80) return '#f87171';
    if (risk > 60) return '#fbbf24';
    if (risk > 40) return '#60a5fa';
    return '#22c55e';
  };

  return (
    <div>
      <PageTitle>{market.name}</PageTitle>

      <InfoGrid>
        <InfoCard>
          <InfoLabel>Fixture</InfoLabel>
          <InfoValue style={{ fontSize: '14px' }}>{market.fixture}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Sport</InfoLabel>
          <InfoValue style={{ fontSize: '14px' }}>{market.sport}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>League</InfoLabel>
          <InfoValue style={{ fontSize: '14px' }}>{market.league}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Status</InfoLabel>
          <InfoValue style={{ fontSize: '14px' }}>{market.status}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Total Bets</InfoLabel>
          <InfoValue>{market.totalBets.toLocaleString()}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Total Stake</InfoLabel>
          <InfoValue>${market.totalStake.toLocaleString()}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Total Liability</InfoLabel>
          <InfoValue>${market.totalLiability.toLocaleString()}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Total Exposure</InfoLabel>
          <InfoValue>${market.totalExposure.toLocaleString()}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Risk Level</InfoLabel>
          <InfoValue style={{ color: getRiskColor(market.risk) }}>
            {market.risk.toFixed(1)}%
          </InfoValue>
        </InfoCard>
      </InfoGrid>

      <SectionTitle>Market Selections</SectionTitle>
      <TableContainer>
        <Table>
          <thead>
            <tr>
              <th>Selection</th>
              <th>Odds</th>
              <th>Bets</th>
              <th>Stake</th>
              <th>Liability</th>
              <th>Exposure</th>
            </tr>
          </thead>
          <tbody>
            {market.selections && market.selections.length > 0 ? (
              market.selections.map((selection: Selection) => (
                <tr key={selection.id}>
                  <td>{selection.name}</td>
                  <td>{selection.odds.toFixed(2)}</td>
                  <td>{selection.bets}</td>
                  <td>${selection.stake.toLocaleString()}</td>
                  <td>${selection.liability.toLocaleString()}</td>
                  <td>${selection.exposure.toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#a0a0a0' }}>
                  No selections found
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableContainer>
    </div>
  );
}
