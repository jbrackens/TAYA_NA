'use client';

import styled from 'styled-components';
import { Button } from '../shared';
import { useState } from 'react';
import { ConfirmModal } from '../shared/ConfirmModal';
import { useConfirm } from '../../hooks/useConfirm';

const ActionsContainer = styled.div`
  background-color: #16213e;
  border: 1px solid #0f3460;
  border-radius: 6px;
  padding: 20px;
`;

const Title = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
`;

const ActionGroup = styled.div`
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const GroupTitle = styled.h4`
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #a0a0a0;
  text-transform: uppercase;
  font-weight: 600;
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
`;

const StyledButton = styled(Button)`
  width: 100%;
`;

const WarningText = styled.p`
  margin: 12px 0 0 0;
  font-size: 11px;
  color: #f87171;
  padding: 8px;
  background-color: rgba(248, 113, 113, 0.1);
  border-radius: 3px;
`;

interface AccountActionsProps {
  punterId: string;
  onAction?: (action: string, data?: any) => void | Promise<void>;
}

export function AccountActions({ punterId, onAction }: AccountActionsProps) {
  const confirm = useConfirm();
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: string, title: string, message: string, impactSummary?: string) => {
    confirm.openConfirm({
      title,
      message,
      impactSummary,
      confirmText: 'Confirm',
      variant: 'danger',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await onAction?.(action);
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  return (
    <>
      <ActionsContainer>
        <Title>Account Actions</Title>

        <ActionGroup>
          <GroupTitle>Account Status</GroupTitle>
          <ButtonGrid>
            <StyledButton
              variant="danger"
              onClick={() =>
                handleAction(
                  'suspend',
                  'Suspend Account',
                  'Suspend this punter\'s account immediately.',
                  'Account will be locked. Punter cannot place bets.',
                )
              }
              disabled={isLoading}
            >
              Suspend
            </StyledButton>
            <StyledButton
              variant="secondary"
              onClick={() =>
                handleAction(
                  'activate',
                  'Activate Account',
                  'Activate this suspended account.',
                  'Account will be restored to active status.',
                )
              }
              disabled={isLoading}
            >
              Activate
            </StyledButton>
          </ButtonGrid>
        </ActionGroup>

        <ActionGroup>
          <GroupTitle>Security</GroupTitle>
          <ButtonGrid>
            <StyledButton
              variant="secondary"
              onClick={() =>
                handleAction(
                  'resetPassword',
                  'Force Password Reset',
                  'Force this punter to reset their password on next login.',
                  'Punter must authenticate with new password.',
                )
              }
              disabled={isLoading}
            >
              Reset Password
            </StyledButton>
            <StyledButton
              variant="secondary"
              onClick={() =>
                handleAction(
                  'disable2FA',
                  'Disable 2FA',
                  'Disable two-factor authentication for this punter.',
                  '2FA will be completely disabled.',
                )
              }
              disabled={isLoading}
            >
              Disable 2FA
            </StyledButton>
          </ButtonGrid>
        </ActionGroup>

        <ActionGroup>
          <GroupTitle>Risk Management</GroupTitle>
          <ButtonGrid>
            <StyledButton
              variant="secondary"
              onClick={() =>
                handleAction(
                  'adjustSegment',
                  'Adjust Risk Segment',
                  'Adjust this punter\'s risk classification.',
                  'Risk segment will be updated.',
                )
              }
              disabled={isLoading}
            >
              Risk Segment
            </StyledButton>
            <StyledButton
              variant="secondary"
              onClick={() =>
                handleAction(
                  'setLimits',
                  'Set Manual Limits',
                  'Set custom deposit, stake, or session time limits.',
                  'Punter will be subject to these limits.',
                )
              }
              disabled={isLoading}
            >
              Set Limits
            </StyledButton>
          </ButtonGrid>
        </ActionGroup>

        <ActionGroup>
          <GroupTitle>Notes & Documentation</GroupTitle>
          <ButtonGrid style={{ gridTemplateColumns: '1fr' }}>
            <StyledButton
              variant="secondary"
              onClick={() => onAction?.('addNote')}
              disabled={isLoading}
            >
              Add Admin Note
            </StyledButton>
          </ButtonGrid>
        </ActionGroup>

        <WarningText>
          Dangerous actions require confirmation. All actions are logged in audit trail.
        </WarningText>
      </ActionsContainer>

      <ConfirmModal
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        impactSummary={confirm.impactSummary}
        confirmText={confirm.confirmText}
        cancelText={confirm.cancelText}
        variant={confirm.variant as 'danger' | 'warning' | 'info'}
        isLoading={confirm.isLoading}
        onConfirm={confirm.handleConfirm}
        onCancel={confirm.handleCancel}
      />
    </>
  );
}
