import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ isOpen, title, onClose, children, footer }, ref) => {
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'auto';
      }

      return () => {
        document.body.style.overflow = 'auto';
      };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    return (
      <div
        className="fixed inset-0 z-[1000] flex animate-[taptrade-fade-in_0.2s_ease] items-center justify-center bg-black/50"
        onClick={handleOverlayClick}
      >
        <div
          ref={ref}
          className="flex max-h-[90vh] w-[90%] max-w-[500px] animate-[taptrade-slide-up_0.2s_ease] flex-col rounded-[16px] border border-[#3d3d5c] bg-[#2d2d44] shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center justify-between border-b border-[#3d3d5c] p-6">
            <h2 className="m-0 text-[28px] font-bold leading-[36px] text-white">
              {title}
            </h2>
            <button
              className="flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-2xl text-[#9a9aad] transition-colors duration-200 ease-in-out hover:text-white"
              onClick={onClose}
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
          {footer && (
            <div className="flex justify-end gap-4 border-t border-[#3d3d5c] p-6">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

export default Modal;
