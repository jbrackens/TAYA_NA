import React, { useEffect } from 'react';
import { cx } from '../utils/classNames';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

const toastVariants: Record<ToastVariant, string> = {
  success: 'border-[#4cd964]',
  error: 'border-[#e85a71]',
  warning: 'border-[#f5c842]',
  info: 'border-[#2196f3]',
};

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
      <div
        ref={ref}
        className={cx(
          'flex min-w-[300px] animate-[taptrade-slide-in_0.2s_ease] items-center gap-4 rounded-[12px] border-2 bg-[#2d2d44] p-4 text-[14px] font-medium leading-[20px] text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
          toastVariants[variant]
        )}
      >
        <span className="shrink-0 text-[20px]">{getIcon()}</span>
        <span className="flex-1">{message}</span>
        {onClose && (
          <button
            className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-[20px] text-[#9a9aad] transition-colors duration-200 ease-in-out hover:text-white"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>
    );
  }
);

Toast.displayName = 'Toast';

export default Toast;
