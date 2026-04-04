'use client';

import styled from 'styled-components';
import { PunterProfile, AccountActions } from '../../components/users';
import { ErrorBoundary, LoadingSpinner, ErrorState } from '../../components/shared';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const PageTitle = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: #ffffff;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

interface PunterProfileData {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  registeredDate: string;
  lastLoginDate: string;
  status: 'active' | 'suspended' | 'verified' | 'unverified';
  balance: number;
  totalBets: number;
  totalStake: number;
  winRate: number;
  riskLevel: 'low' | 'medium' | 'high';
  verified: boolean;
  suspiciousActivity: boolean;
  memberSince: string;
  segment: string;
  P_L: number;
}

const SAMPLE_PUNTER: PunterProfileData = {
  id: '1',
  username: 'john_doe',
  email: 'john@example.com',
  avatar: 'JD',
  registeredDate: '2024-01-15',
  lastLoginDate: '2024-04-01',
  status: 'active',
  balance: 5250,
  totalBets: 245,
  totalStake: 12500,
  winRate: 52.3,
  riskLevel: 'low',
  verified: true,
  suspiciousActivity: false,
  memberSince: '2024-01-15',
  segment: 'Regular',
  P_L: 1250,
};

function UserDetailPageContent() {
  const params = useParams();
  const punterId = params.id as string;
  const [punter, setPunter] = useState<PunterProfileData | null>(null);
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
        // const data = await get(`/api/admin/users/${punterId}`);
        // setPunter(data);
        setPunter({ ...SAMPLE_PUNTER, id: punterId });
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user');
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [punterId]);

  const handleAction = (action: string) => {
    console.log('Action:', action, 'for punter:', punterId);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      setPunter({ ...SAMPLE_PUNTER, id: punterId });
      setIsLoading(false);
    }, 500);
  };

  if (isLoading) {
    return (
      <div>
        <PageTitle>Loading...</PageTitle>
        <LoadingSpinner centered={true} text="Loading user details..." />
      </div>
    );
  }

  if (error || !punter) {
    return (
      <div>
        <PageTitle>Error</PageTitle>
        <ErrorState
          title="Failed to load user"
          message={error || 'User not found'}
          onRetry={handleRetry}
          showRetryButton={true}
        />
      </div>
    );
  }

  return (
    <div>
      <PageTitle>{punter.username}</PageTitle>

      <ContentGrid>
        <div>
          <PunterProfile
            punter={punter}
            onAction={handleAction}
          />
        </div>

        <div style={{ height: 'fit-content' }}>
          <AccountActions
            punterId={punterId}
            onAction={handleAction}
          />
        </div>
      </ContentGrid>
    </div>
  );
}

export default function UserDetailPage() {
  return (
    <ErrorBoundary>
      <UserDetailPageContent />
    </ErrorBoundary>
  );
}
