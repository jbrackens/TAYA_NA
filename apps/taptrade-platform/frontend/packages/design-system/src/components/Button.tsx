import React from 'react';
import { cx } from '../utils/classNames';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-[#2196f3] text-white hover:opacity-90 active:opacity-80',
  secondary:
    'border border-[#3d3d5c] bg-[#2d2d44] text-white hover:bg-[#4a4a5e] active:bg-[#4a4a5e] active:opacity-80',
  ghost: 'bg-transparent text-[#2196f3] hover:bg-[#2d2d44] active:opacity-80',
  danger: 'bg-[#e85a71] text-white hover:opacity-90 active:opacity-80',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'rounded-lg px-2 py-1 text-[12px] leading-[16px]',
  md: 'rounded-[12px] px-4 py-2 text-[14px] leading-[20px]',
  lg: 'rounded-[12px] px-6 py-4 text-[18px] leading-[24px]',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cx(
          'inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap border-0 font-semibold transition-all duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2196f3] disabled:cursor-not-allowed disabled:opacity-50',
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
