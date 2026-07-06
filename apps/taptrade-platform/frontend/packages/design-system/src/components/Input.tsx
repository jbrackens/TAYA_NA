import React from 'react';
import { cx } from '../utils/classNames';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cx(
          'w-full rounded-lg border bg-[#2d2d44] px-4 py-2 text-[14px] leading-[20px] text-white placeholder:text-[#9a9aad] transition-all duration-200 ease-in-out focus:outline-none focus:ring-[3px] disabled:cursor-not-allowed disabled:bg-[#4a4a5e] disabled:opacity-50',
          error
            ? 'border-[#e85a71] focus:border-[#e85a71] focus:ring-[rgba(232,90,113,0.1)]'
            : 'border-[#3d3d5c] focus:border-[#2196f3] focus:ring-[rgba(33,150,243,0.1)]',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export default Input;
