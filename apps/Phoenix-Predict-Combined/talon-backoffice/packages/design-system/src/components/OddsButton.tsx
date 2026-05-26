import React from 'react';
import { cx } from '../utils/classNames';

interface OddsButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  odds: number;
  selected?: boolean;
  suspended?: boolean;
  movement?: 'up' | 'down' | null;
}

export const OddsButton = React.forwardRef<HTMLButtonElement, OddsButtonProps>(
  (
    { odds, selected = false, suspended = false, movement, className, ...props },
    ref
  ) => {
    const getMovementSymbol = () => {
      if (!movement) return null;
      return movement === 'up' ? '↑' : '↓';
    };

    return (
      <button
        ref={ref}
        className={cx(
          'flex min-w-[80px] cursor-pointer flex-col items-center gap-1 rounded-lg border-2 px-4 py-2 text-[14px] font-semibold leading-[20px] text-white transition-all duration-200 ease-in-out focus:outline-none focus:ring-[3px] focus:ring-[rgba(33,150,243,0.2)] disabled:cursor-not-allowed disabled:opacity-50',
          selected
            ? 'border-[#2196f3] bg-[#2196f3] hover:border-[#2196f3] hover:bg-[#2196f3]'
            : 'border-[#3d3d5c] bg-[#2d2d44] hover:border-[#2196f3] hover:bg-[#4a4a5e]',
          suspended && 'pointer-events-none cursor-not-allowed opacity-50',
          className
        )}
        {...props}
      >
        <span className="text-[28px] font-bold leading-[36px]">
          {odds.toFixed(2)}
        </span>
        {movement && (
          <span
            className={cx(
              'text-[12px] leading-[16px]',
              movement === 'up' ? 'text-[#4caf50]' : 'text-[#e85a71]'
            )}
          >
            {getMovementSymbol()}
          </span>
        )}
      </button>
    );
  }
);

OddsButton.displayName = 'OddsButton';

export default OddsButton;
