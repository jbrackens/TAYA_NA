'use client';

import styled from 'styled-components';
import { Card, Badge } from '../../components/shared';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: #ffffff;
`;

const TableContainer = styled(Card)`
  padding: 24px;
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
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const RiskBar = styled.div`
  display: flex;
  height: 20px;
  background-color: #0f3460;
  border-radius: 3px;
  overflow: hidden;
  max-width: 100px;
`;

interface RiskSegment {
  percentage: number;
  color: string;
}

const RiskSegmentComponent = styled.div<{ $width: number; $color: string }>`
  width: ${props => props.$width}%;
  background-color: ${props => props.$color};
  height: 100%;
`;

interface Fixture {
  id: string;
  match: string;
  sport: string;
  league: string;
  liability: number;
  exposure: number;
  risk: number;
  marketCount: number;
  status: 'low' | 'medium' | 'high' | 'critical';
}

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/admin/risk-fixtures`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setFixtures(data);
      } catch (error) {
        console.error('Failed to fetch fixtures:', error);
        setFixtures([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFixtures();
  }, []);

  const getRiskColor = (risk: number) => {
    if (risk > 80) return '#f87171';
    if (risk > 60) return '#fbbf24';
    if (risk > 40) return '#60a5fa';
    return '#22c55e';
  };

  const getRiskBadgeVariant = (status: string) => {
    switch (status) {
      case 'critical':
      case 'high':
        return 'danger';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'primary';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return <div style={{ padding: '40px', color: '#a0a0a0' }}>Loading fixtures...</div>;
  }

  return (
    <div>
      <PageTitle>Risk-Adjusted Fixtures</PageTitle>

      <TableContainer>
        <Table>
          <thead>
            <tr>
              <th>Match</th>
              <th>Sport</th>
              <th>League</th>
              <th>Markets</th>
              <th>Liability</th>
              <th>Exposure</th>
              <th>Risk</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.length > 0 ? (
              fixtures.map((fixture) => (
                <tr key={fixture.id}>
                  <td>
                    <LinkCell href={`/risk-management/fixtures/${fixture.id}`}>
                      {fixture.match}
                    </LinkCell>
                  </td>
                  <td>{fixture.sport}</td>
                  <td>{fixture.league}</td>
                  <td>{fixture.marketCount}</td>
                  <td>${fixture.liability.toLocaleString()}</td>
                  <td>${fixture.exposure.toLocaleString()}</td>
                  <td>
                    <RiskBar>
                      <RiskSegmentComponent
                        $width={fixture.risk}
                        $color={getRiskColor(fixture.risk)}
                      />
                    </RiskBar>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>
                      {fixture.risk.toFixed(1)}%
                    </div>
                  </td>
                  <td>
                    <Badge variant={getRiskBadgeVariant(fixture.status)}>
                      {fixture.status.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#a0a0a0' }}>
                  No fixtures found
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableContainer>
    </div>
  );
}
