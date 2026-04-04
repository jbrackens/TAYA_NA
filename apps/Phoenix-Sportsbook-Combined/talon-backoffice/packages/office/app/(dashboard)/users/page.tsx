'use client';

import styled from 'styled-components';
import { PunterSearch } from '../components/users';
import { ErrorBoundary, LoadingSpinner, ErrorState, SkeletonLoader } from '../components/shared';
import { useState, useEffect } from 'react';

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: #ffffff;
`;

interface PunterData {
  id: string;
  username: string;
  email: string;
  registeredDate: string;
  totalBets: number;
  totalStake: number;
  status: 'active' | 'suspended' | 'verified' | 'unverified';
  riskLevel: 'low' | 'medium' | 'high';
}

const SAMPLE_PUNTERS: PunterData[] = [
  {
    id: '1',
    username: 'john_doe',
    email: 'john@example.com',
    registeredDate: '2024-01-15',
    totalBets: 245,
    totalStake: 12500,
    status: 'active',
    riskLevel: 'low',
  },
  {
    id: '2',
    username: 'jane_smith',
    email: 'jane@example.com',
    registeredDate: '2024-02-20',
    totalBets: 156,
    totalStake: 8900,
    status: 'active',
    riskLevel: 'medium',
  },
  {
    id: '3',
    username: 'high_roller',
    email: 'roller@example.com',
    registeredDate: '2024-03-10',
    totalBets: 512,
    totalStake: 45000,
    status: 'suspended',
    riskLevel: 'high',
  },
];

function UsersPageContent() {
  const [punters, setPunters] = useState<PunterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    setIsLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      try {
        // Replace with actual API call:
        // const { get } = useAdminApi();
        // const data = await get('/api/admin/users');
        // setPunters(data);
        setPunters(SAMPLE_PUNTERS);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handlePunterSelect = (punter: PunterData) => {
    console.log('Selected punter:', punter);
    // Navigate to punter detail page
    window.location.href = `/users/${punter.id}`;
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      setPunters(SAMPLE_PUNTERS);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div>
      <PageTitle>Users</PageTitle>

      {error ? (
        <ErrorState
          title="Failed to load users"
          message={error}
          onRetry={handleRetry}
          showRetryButton={true}
        />
      ) : isLoading ? (
        <SkeletonLoader count={3} />
      ) : (
        <PunterSearch
          punters={punters}
          onPunterSelect={handlePunterSelect}
          isLoading={false}
        />
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <ErrorBoundary>
      <UsersPageContent />
    </ErrorBoundary>
  );
}
