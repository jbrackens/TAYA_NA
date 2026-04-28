"use client";

import styled from "styled-components";

const ModalOverlay = styled.div<{ $isOpen?: boolean }>`
  display: ${(props) => (props.$isOpen ? "flex" : "none")};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(26, 26, 26, 0.45);
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: var(--surface-1, #ffffff);
  border: 1px solid var(--border-1, #e5dfd2);
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow:
    0 12px 48px rgba(26, 26, 26, 0.08),
    0 1px 2px rgba(26, 26, 26, 0.04);
`;

const ModalTitle = styled.h2`
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--t1, #1a1a1a);
  letter-spacing: -0.01em;
`;

const ModalMessage = styled.p`
  margin: 0 0 20px 0;
  font-size: 14px;
  color: var(--t2, #4a4a4a);
  line-height: 1.5;
`;

const ImpactSummary = styled.div`
  background-color: var(--no-soft, rgba(255, 139, 107, 0.16));
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  border-left: 3px solid var(--no-text, #a8472d);
`;

const ImpactText = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--no-text, #a8472d);
  font-weight: 500;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const BaseButton = styled.button`
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
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
    transform: translateY(-1px);
  }
`;

const CancelButton = styled(BaseButton)`
  background-color: var(--surface-1, #ffffff);
  color: var(--t1, #1a1a1a);
  border: 1px solid var(--border-1, #e5dfd2);

  &:hover:not(:disabled) {
    background-color: var(--surface-2, #fcfaf5);
    border-color: var(--focus-ring, #0e7a53);
  }
`;

const ConfirmButton = styled(BaseButton)`
  background-color: var(--accent, #2be480);
  color: #003827;

  &:hover:not(:disabled) {
    background-color: var(--accent-lo, #1fa65e);
    color: #ffffff;
  }

  &.danger {
    background-color: var(--no-text, #a8472d);
    color: #ffffff;

    &:hover:not(:disabled) {
      background-color: #8b3a25;
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
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen = false,
  title,
  message,
  impactSummary,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
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
          <CancelButton onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </CancelButton>
          <ConfirmButton
            className={variant === "danger" ? "danger" : ""}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmText}
          </ConfirmButton>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
}
