'use client';

import styled from 'styled-components';

const ModalOverlay = styled.div<{ $isOpen?: boolean }>`
  display: ${(props) => (props.$isOpen ? 'flex' : 'none')};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: #16213e;
  border: 1px solid #0f3460;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
`;

const ModalTitle = styled.h2`
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
`;

const ModalMessage = styled.p`
  margin: 0 0 20px 0;
  font-size: 14px;
  color: #a0a0a0;
  line-height: 1.5;
`;

const ImpactSummary = styled.div`
  background-color: #0f3460;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  border-left: 3px solid #f87171;
`;

const ImpactText = styled.p`
  margin: 0;
  font-size: 13px;
  color: #ffffff;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const BaseButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
  flex: 1;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }
`;

const CancelButton = styled(BaseButton)`
  background-color: #0f3460;
  color: #4a7eff;
  border: 1px solid #0f3460;

  &:hover:not(:disabled) {
    background-color: #16213e;
    border-color: #4a7eff;
  }
`;

const ConfirmButton = styled(BaseButton)`
  background-color: #4a7eff;
  color: #1a1a2e;

  &:hover:not(:disabled) {
    background-color: #6593ff;
  }

  &.danger {
    background-color: #f87171;
    color: #ffffff;

    &:hover:not(:disabled) {
      background-color: #ef4444;
    }
  }
`;

interface ConfirmModalProps {
  isOpen?: boolean;
  title: string;
  message: string;
  impactSummary?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen = false,
  title,
  message,
  impactSummary,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <ModalOverlay $isOpen={isOpen} onClick={onCancel}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{title}</ModalTitle>
        <ModalMessage>{message}</ModalMessage>

        {impactSummary && (
          <ImpactSummary>
            <ImpactText>{impactSummary}</ImpactText>
          </ImpactSummary>
        )}

        <ButtonGroup>
          <CancelButton
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </CancelButton>
          <ConfirmButton
            className={variant === 'danger' ? 'danger' : ''}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </ConfirmButton>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
}
