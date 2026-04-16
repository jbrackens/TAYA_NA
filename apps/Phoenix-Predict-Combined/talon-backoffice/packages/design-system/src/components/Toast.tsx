import React, { useEffect } from 'react';
import styled from 'styled-components';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface StyledToastProps {
  $variant: ToastVariant;
}

const getVariantColor = (variant: ToastVariant, theme: any) => {
  switch (variant) {
    case 'success':
      return theme.colors.finished;
    case 'error':
      return theme.colors.error;
    case 'warning':
      return theme.colors.live;
    case 'info':
      return theme.colors.accentBlue;
  }
};

const StyledToast = styled.div<StyledToastProps>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.surface};
  border: 2px solid ${({ theme, $variant }) => getVariantColor($variant, theme)};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.base.fontSize};
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: slideIn ${({ theme }) => theme.motion.fast};
  min-width: 300px;

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

const ToastIcon = styled.span`
  font-size: 20px;
  flex-shrink: 0;
`;

const ToastMessage = styled.span`
  flex: 1;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  padding: 0;
  font-size: 20px;
  flex-shrink: 0;
  transition: color ${({ theme }) => theme.motion.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

interface ToastProps {
  variant?: ToastVariant;
  message: string;
  onClose?: () => void;
  duration?: number;
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ variant = 'info', message, onClose, duration = 5000 }, ref) => {
    useEffect(() => {
      if (duration && onClose) {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
      }
    }, [duration, onClose]);

    const getIcon = () => {
      switch (variant) {
        case 'success':
          return '✓';
        case 'error':
          return '✕';
        case 'warning':
          return '⚠';
        case 'info':
          return 'ℹ';
      }
    };

    return (
      <StyledToast ref={ref} $variant={variant}>
        <ToastIcon>{getIcon()}</ToastIcon>
        <ToastMessage>{message}</ToastMessage>
        {onClose && <CloseButton onClick={onClose}>×</CloseButton>}
      </StyledToast>
    );
  }
);

Toast.displayName = 'Toast';

export default Toast;
