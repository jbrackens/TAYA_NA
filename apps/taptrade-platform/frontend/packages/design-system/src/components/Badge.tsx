import React from 'react';
import { cx } from '../utils/classNames';

type BadgeVariant = 'live' | 'finished' | 'upcoming' | 'cancelled';

const badgeVariants: Record<BadgeVariant, string> = {
  live: 'animate-pulse bg-[#f5c842] text-black',
  finished: 'bg-[#4cd964] text-white',
  upcoming: 'bg-[#9a9aad] text-white',
  cancelled: 'bg-[#e85a71] text-white',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'upcoming', children, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cx(
          'inline-flex items-center justify-center whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-semibold leading-[16px]',
          badgeVariants[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
