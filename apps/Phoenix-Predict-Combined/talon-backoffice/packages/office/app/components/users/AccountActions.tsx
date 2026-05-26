"use client";

import styled from "styled-components";
import { Button } from "../shared";
import { useState } from "react";
import { ConfirmModal } from "../shared/ConfirmModal";
import { useConfirm } from "../../hooks/useConfirm";

const ActionsContainer = styled.div`
  background-color: var(--surface-1, var(--t1, #1a1a1a));
  border: 1px solid var(--border-1, #e5dfd2);
  border-radius: 6px;
  padding: 20px;
`;

const Title = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--t1, #1a1a1a);
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
  color: var(--t2, #4a4a4a);
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

interface AccountActionsProps {
  currentStatus?: "active" | "suspended" | "inactive";
  onAction?: (action: string, data?: any) => void | Promise<void>;
}

export function AccountActions({
  currentStatus,
  onAction,
}: AccountActionsProps) {
  const confirm = useConfirm();
  const [isLoading, setIsLoading] = useState(false);
  const statusActionsAvailable = typeof onAction === "function";
  const canSuspend = statusActionsAvailable && currentStatus !== "suspended";
  const canActivate = statusActionsAvailable && currentStatus === "suspended";

  const handleAction = async (
    action: string,
    title: string,
    message: string,
  ) => {
    if (!statusActionsAvailable) {
      return;
    }
    confirm.openConfirm({
      title,
      message,
      confirmText: "Confirm",
      variant: "danger",
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
                  "suspend",
                  "Suspend Account",
                  "Suspend this punter's account immediately.",
                )
              }
              disabled={isLoading || !canSuspend}
            >
              Suspend
            </StyledButton>
            <StyledButton
              variant="secondary"
              onClick={() =>
                handleAction(
                  "activate",
                  "Activate Account",
                  "Activate this suspended account.",
                )
              }
              disabled={isLoading || !canActivate}
            >
              Activate
            </StyledButton>
          </ButtonGrid>
        </ActionGroup>

        <ActionGroup>
          <GroupTitle>Notes & Documentation</GroupTitle>
          <ButtonGrid style={{ gridTemplateColumns: "1fr" }}>
            <StyledButton
              variant="secondary"
              onClick={() => {
                if (!statusActionsAvailable) return;
                const content = window.prompt(
                  "Add an admin note for this punter:",
                );
                if (content && content.trim()) {
                  onAction?.("addNote", { content: content.trim() });
                }
              }}
              disabled={isLoading}
            >
              Add Admin Note
            </StyledButton>
          </ButtonGrid>
        </ActionGroup>
      </ActionsContainer>

      <ConfirmModal
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        cancelText={confirm.cancelText}
        variant={confirm.variant as "danger" | "warning" | "info"}
        isLoading={confirm.isLoading}
        onConfirm={confirm.handleConfirm}
        onCancel={confirm.handleCancel}
      />
    </>
  );
}
