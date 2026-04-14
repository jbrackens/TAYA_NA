'use client';

import styled from 'styled-components';

// Reusable Card component — TAYA NA! admin design tokens
export const Card = styled.div`
  padding: 20px;
  background-color: #0f1225;
  border: 1px solid #1a1f3a;
  border-radius: 10px;
`;

// Reusable Badge component — semantic status colors
export const Badge = styled.span<{ $variant?: 'default' | 'success' | 'warning' | 'danger' }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background-color: ${(props) => {
    switch (props.$variant) {
      case 'success':
        return 'rgba(34,197,94,0.12)';
      case 'warning':
        return 'rgba(251,191,36,0.12)';
      case 'danger':
        return 'rgba(239,68,68,0.12)';
      default:
        return 'rgba(74,126,255,0.12)';
    }
  }};
  color: ${(props) => {
    switch (props.$variant) {
      case 'success':
        return '#22c55e';
      case 'warning':
        return '#fbbf24';
      case 'danger':
        return '#f87171';
      default:
        return '#4a7eff';
    }
  }};
`;

// Reusable Button component — admin green primary, ghost secondary
export const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger'; $size?: 'sm' | 'md' | 'lg'; variant?: 'primary' | 'secondary' | 'danger'; size?: 'sm' | 'md' | 'lg' }>`
  padding: ${(props) => {
    const sz = props.$size || props.size;
    switch (sz) {
      case 'sm':
        return '6px 12px';
      case 'lg':
        return '12px 24px';
      default:
        return '10px 20px';
    }
  }};
  background: ${(props) => {
    const variant = props.$variant || props.variant;
    switch (variant) {
      case 'secondary':
        return '#161a35';
      case 'danger':
        return 'transparent';
      default:
        return 'linear-gradient(135deg, #4ade80, #22c55e)';
    }
  }};
  color: ${(props) => {
    const variant = props.$variant || props.variant;
    switch (variant) {
      case 'secondary':
        return '#e2e8f0';
      case 'danger':
        return '#f87171';
      default:
        return '#101114';
    }
  }};
  border: ${(props) => {
    const variant = props.$variant || props.variant;
    switch (variant) {
      case 'secondary':
        return '1px solid #1a1f3a';
      case 'danger':
        return '1.5px solid #ef4444';
      default:
        return 'none';
    }
  }};
  border-radius: 8px;
  cursor: pointer;
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 600;
  font-size: ${(props) => {
    const sz = props.$size || props.size;
    return sz === 'sm' ? '12px' : '14px';
  }};
  transition: all 0.15s ease;
  box-shadow: ${(props) => {
    const variant = props.$variant || props.variant;
    return variant === 'primary' || !variant ? '0 4px 12px rgba(74,222,128,0.15)' : 'none';
  }};

  &:hover:not(:disabled) {
    ${(props) => {
      const variant = props.$variant || props.variant;
      switch (variant) {
        case 'secondary':
          return 'background-color: #1a2040; border-color: #2a3050;';
        case 'danger':
          return 'background: rgba(239,68,68,0.12);';
        default:
          return 'box-shadow: 0 4px 16px rgba(74,222,128,0.25);';
      }
    }}
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Reusable Input component — admin form styling
export const Input = styled.input`
  padding: 10px 14px;
  background-color: #0b0e1c;
  border: 1px solid #1a1f3a;
  color: #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  font-family: 'IBM Plex Sans', sans-serif;
  height: 40px;
  transition: all 0.15s ease;

  &::placeholder {
    color: #64748b;
  }

  &:focus {
    outline: none;
    border-color: #4ade80;
    box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.15);
  }
`;
