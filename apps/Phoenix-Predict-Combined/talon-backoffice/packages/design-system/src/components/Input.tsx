import React from 'react';
import styled from 'styled-components';

interface StyledInputProps {
  $hasError?: boolean;
}

const StyledInput = styled.input<StyledInputProps>`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  background-color: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme, $hasError }) => ($hasError ? theme.colors.error : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.base.fontSize};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  transition: all ${({ theme }) => theme.motion.fast};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme, $hasError }) => ($hasError ? theme.colors.error : theme.colors.accentBlue)};
    box-shadow: 0 0 0 3px ${({ theme, $hasError }) => ($hasError ? 'rgba(232, 90, 113, 0.1)' : 'rgba(33, 150, 243, 0.1)')};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.card};
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, ...props }, ref) => {
    return <StyledInput ref={ref} $hasError={error} {...props} />;
  }
);

Input.displayName = 'Input';

export default Input;
