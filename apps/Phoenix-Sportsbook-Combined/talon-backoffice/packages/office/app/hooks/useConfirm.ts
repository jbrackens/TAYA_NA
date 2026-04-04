'use client';

import { useState, useCallback } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  isLoading?: boolean;
}

const DEFAULT_STATE: ConfirmState = {
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'warning',
};

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(DEFAULT_STATE);

  const openConfirm = useCallback((options: ConfirmOptions) => {
    setState({
      ...DEFAULT_STATE,
      ...options,
      isOpen: true,
      isLoading: false,
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      if (state.onConfirm) {
        await state.onConfirm();
      }
    } finally {
      closeConfirm();
    }
  }, [state, closeConfirm]);

  const handleCancel = useCallback(() => {
    state.onCancel?.();
    closeConfirm();
  }, [state, closeConfirm]);

  return {
    ...state,
    openConfirm,
    closeConfirm,
    handleConfirm,
    handleCancel,
  };
}
