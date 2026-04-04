'use client';

import styled from 'styled-components';
import { Card, Badge } from '../../../components/shared';
import Link from 'next/link';
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
    border-bottom: 1px solid #0f3460;
    font-weight: 600;
    font-size: 12px;
    color: #a0a0a0;
    text-transform: uppercase;
  }

  td {
    padding: 12px;
    border-bottom: 1px solid #0f3460;
    font-size: 13px;
    color: #ffffff;
  }

  tr:hover {
    background-color: rgba(74, 126, 255, 0.05);
  }
`;

const LinkCell = styled(Link)`
  color: #4a7eff;
  text-decoration: none;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
`;

interface Market {
  id: string;
  name: string;
  odds: number;
  totalBets: number;
  totalStake: number;
  liability: number;
  exposure: number;
  risk: number;
}

interface Fixture {
  id: string;
  match: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  totalLiability: number;
  totalExposure: number;
  totalRisk: number;
  marketCount: number;
  betCount: number;
  markets?: Market[];
}

export default function FixtureDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFixtureDetail = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/admin/fixtures/${id}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setFixture(data);
      } catch (error) {
        console.error('Failed to fetch fixture:', error);
        setFixture(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchFixtureDetail();
    }
  }, [id]);

  if (isLoading) {
    return <div style={{ padding: '40px', color: '#a0a0a0' }}>Loading fixture...</div>;
  }

  if (!fixture) {
    return <div style={{ padding: '40px', color: '#a0a0a0' }}>Fixture not found</div>;
  }

  const getRiskColor = (risk: number) => {
    if (risk > 80) return '#f87171';
    if (risk > 60) return '#fbbf24';
    if (risk > 40) return '#60a5fa';
    return '#22c55e';
  };

  return (
    <div>
      <PageTitle>{fixture.match}</PageTitle>

      <InfoGrid>
        <InfoCard>
          <InfoLabel>Sport</InfoLabel>
          <InfoValue style={{ fontSize: '14px' }}>{fixture.sport}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>League</InfoLabel>
          <InfoValue style={{ fontSize: '14px' }}>{fixture.league}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Status</InfoLabel>
          <InfoValue style={{ fontSize: '14px' }}>{fixture.status}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Markets</InfoLabel>
          <InfoValue>{fixture.marketCount}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Total Bets</InfoLabel>
          <InfoValue>{fixture.betCount.toLocaleString()}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Total Liability</InfoLabel>
          <InfoValue>${fixture.totalLiability.toLocaleString()}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Total Exposure</InfoLabel>
          <InfoValue>${fixture.totalExposure.toLocaleString()}</InfoValue>
        </InfoCard>

        <InfoCard>
          <InfoLabel>Risk Level</InfoLabel>
          <InfoValue style={{ color: getRiskColor(fixture.totalRisk) }}>
            {fixture.totalRisk.toFixed(1)}%
          </InfoValue>
        </InfoCard>
      </InfoGrid>

      <SectionTitle>Markets</SectionTitle>
      <TableContainer>
        <Table>
          <thead>
            <tr>
              <th>Market</th>
              <th>Bets</th>
              <th>Stake</th>
              <th>Liability</th>
              <th>Exposure</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {fixture.markets && fixture.markets.length > 0 ? (
              fixture.markets.map((market: Market) => (
                <tr key={market.id}>
                  <td>
                    <LinkCell href={`/risk-management/markets/${market.id}`}>
                      {market.name}
                    </LinkCell>
                  </td>
                  <td>{market.totalBets}</td>
                  <td>${market.totalStake.toLocaleString()}</td>
                  <td>${market.liability.toLocaleString()}</td>
                  <td>${market.exposure.toLocaleString()}</td>
                  <td style={{ color: getRiskColor(market.risk) }}>
                    {market.risk.toFixed(1)}%
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#a0a0a0' }}>
                  No markets found
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableContainer>
    </div>
  );
}
