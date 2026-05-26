import React from 'react';
import { cx } from '../utils/classNames';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cx(
          'rounded-[12px] border border-[#3d3d5c] bg-[#4a4a5e] p-4 transition-all duration-200 ease-in-out hover:border-[#9a9aad] hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
