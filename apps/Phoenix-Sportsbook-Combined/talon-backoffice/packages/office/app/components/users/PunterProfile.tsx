'use client';

import styled from 'styled-components';
import { Badge, Button, Card } from '../shared';
import { useState } from 'react';

const ProfileContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const InfoCard = styled(Card)`
  padding: 20px;
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`;

const Avatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a7eff 0%, #2e5cb8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 700;
  font-size: 24px;
`;

const HeaderInfo = styled.div`
  flex: 1;
`;

const Name = styled.h2`
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
`;

const Email = styled.p`
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #a0a0a0;
`;

const BadgeGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #0f3460;

  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.span`
  color: #a0a0a0;
  font-size: 12px;
`;

const InfoValue = styled.span`
  color: #ffffff;
  font-weight: 600;
  font-size: 13px;
`;

const TabsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
`;

const TabButton = styled.button<{ $active?: boolean }>`
  padding: 12px;
  background-color: ${(props) => (props.$active ? '#4a7eff' : '#0f3460')};
  color: ${(props) => (props.$active ? '#1a1a2e' : '#a0a0a0')};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 12px;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${(props) => (props.$active ? '#4a7eff' : 'rgba(74, 126, 255, 0.2)')};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
`;

const ContentArea = styled(Card)`
  padding: 20px;
  background-color: #16213e;
  border: 1px solid #0f3460;
`;

const TabContent = styled.div`
  color: #a0a0a0;
`;

export interface PunterProfileData {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  status: 'active' | 'suspended' | 'inactive';
  riskSegment: 'low' | 'medium' | 'high' | 'vip';
  verificationStatus: 'verified' | 'pending' | 'failed';
  totalBets: number;
  pnl: number;
  balance: number;
}

interface PunterProfileProps {
  punter?: PunterProfileData;
  onAction?: (action: string) => void;
  actionsAvailable?: boolean;
}

export function PunterProfile({
  punter,
  onAction,
  actionsAvailable = true,
}: PunterProfileProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!punter) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#a0a0a0' }}>
        Select a punter to view profile
      </div>
    );
  }

  const initials = punter.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const statusColor = {
    active: 'success',
    suspended: 'danger',
    inactive: 'default',
  } as const;

  const verificationColor = {
    verified: 'success',
    pending: 'warning',
    failed: 'danger',
  } as const;
  const canSuspend = actionsAvailable && punter.status !== 'suspended';
  const canActivate = actionsAvailable && punter.status === 'suspended';

  return (
    <ProfileContainer>
      <div>
        <InfoCard>
          <ProfileHeader>
            <Avatar>{initials}</Avatar>
            <HeaderInfo>
              <Name>{punter.name}</Name>
              <Email>{punter.email}</Email>
              <BadgeGroup>
                <Badge $variant={statusColor[punter.status]}>
                  {punter.status.toUpperCase()}
                </Badge>
                <Badge $variant={verificationColor[punter.verificationStatus]}>
                  {punter.verificationStatus.toUpperCase()}
                </Badge>
              </BadgeGroup>
            </HeaderInfo>
          </ProfileHeader>

          <InfoRow>
            <InfoLabel>Member Since</InfoLabel>
            <InfoValue>{new Date(punter.createdAt).toLocaleDateString()}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Risk Segment</InfoLabel>
            <InfoValue style={{ color: punter.riskSegment === 'high' ? '#f87171' : punter.riskSegment === 'vip' ? '#4a7eff' : '#a0a0a0' }}>
              {punter.riskSegment.toUpperCase()}
            </InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Current Balance</InfoLabel>
            <InfoValue>${punter.balance.toLocaleString()}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Total Bets</InfoLabel>
            <InfoValue>{punter.totalBets.toLocaleString()}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>P&L</InfoLabel>
            <InfoValue style={{ color: punter.pnl >= 0 ? '#22c55e' : '#f87171' }}>
              {punter.pnl >= 0 ? '+' : ''}${Math.abs(punter.pnl).toLocaleString()}
            </InfoValue>
          </InfoRow>

          <ActionButtons>
            <Button
              variant="secondary"
              onClick={() => onAction?.(punter.status === 'suspended' ? 'activate' : 'suspend')}
              disabled={!canSuspend && !canActivate}
            >
              {punter.status === 'suspended' ? 'Activate Account' : 'Suspend Account'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onAction?.('resetPassword')}
              disabled={true}
            >
              Force Password Reset
            </Button>
            <Button
              variant="secondary"
              onClick={() => onAction?.('addNote')}
              disabled={true}
            >
              Add Note
            </Button>
          </ActionButtons>

          <div
            style={{
              marginTop: '12px',
              fontSize: '12px',
              color: '#a0a0a0',
              lineHeight: 1.5,
            }}
          >
            {actionsAvailable
              ? 'Suspend and activate are live. Password reset and note actions are still awaiting backend support.'
              : 'Admin account mutations are read-only here until the Go backoffice mutation routes are implemented.'}
          </div>
        </InfoCard>
      </div>

      <div>
        <InfoCard>
          <TabsContainer>
            <TabButton $active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
              Overview
            </TabButton>
            <TabButton $active={activeTab === 'bets'} onClick={() => setActiveTab('bets')}>
              Recent Bets
            </TabButton>
            <TabButton $active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')}>
              Wallet
            </TabButton>
          </TabsContainer>
        </InfoCard>

        <ContentArea>
          {activeTab === 'overview' && (
            <TabContent>
              <h4 style={{ color: '#ffffff', marginTop: 0 }}>Account Overview</h4>
              <p>Detailed account information and activity logs would be displayed here.</p>
            </TabContent>
          )}
          {activeTab === 'bets' && (
            <TabContent>
              <h4 style={{ color: '#ffffff', marginTop: 0 }}>Recent Bets</h4>
              <p>Bet history table would be displayed here.</p>
            </TabContent>
          )}
          {activeTab === 'wallet' && (
            <TabContent>
              <h4 style={{ color: '#ffffff', marginTop: 0 }}>Wallet & Transactions</h4>
              <p>Transaction history would be displayed here.</p>
            </TabContent>
          )}
        </ContentArea>
      </div>
    </ProfileContainer>
  );
}
