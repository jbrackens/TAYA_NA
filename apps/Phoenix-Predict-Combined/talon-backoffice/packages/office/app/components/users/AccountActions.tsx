"use client";

import { Button } from "../shared";
import { useState } from "react";
import { ConfirmModal } from "../shared/ConfirmModal";
import { useConfirm } from "../../hooks/useConfirm";

interface AccountActionsProps {
  currentStatus?: "active" | "suspended" | "inactive";
  onAction?: (action: string, data?: any) => void | Promise<void>;
  /** GAP-102 (§29): whether the caller may mutate account status / add notes
   * (users:write). Fail-closed — a read-only caller sees these disabled. */
  canManageStatus?: boolean;
}

export function AccountActions({
  currentStatus,
  onAction,
  canManageStatus = false,
}: AccountActionsProps) {
  const confirm = useConfirm();
  const [isLoading, setIsLoading] = useState(false);
  const statusActionsAvailable =
    typeof onAction === "function" && canManageStatus;
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
      <div className="rounded-md border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] p-5">
        <h3 className="m-0 mb-4 text-base font-semibold text-[var(--t1,#1a1a1a)]">
          Account Actions
        </h3>

        <div className="mb-5 last:mb-0">
          <h4 className="m-0 mb-3 text-[13px] font-semibold uppercase text-[var(--t2,#4a4a4a)]">
            Account Status
          </h4>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
            <Button
              className="w-full"
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
            </Button>
            <Button
              className="w-full"
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
            </Button>
          </div>
        </div>

        <div className="mb-0">
          <h4 className="m-0 mb-3 text-[13px] font-semibold uppercase text-[var(--t2,#4a4a4a)]">
            Notes & Documentation
          </h4>
          <div className="grid grid-cols-1 gap-2">
            <Button
              className="w-full"
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
              disabled={isLoading || !canManageStatus}
            >
              Add Admin Note
            </Button>
          </div>
        </div>
      </div>

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
