'use client';

import styled from 'styled-components';

// Reusable Card component
export const Card = styled.div`
  padding: 16px;
  background-color: #16213e;
  border: 1px solid #0f3460;
  border-radius: 8px;
`;

// Reusable Badge component
export const Badge = styled.span<{ $variant?: 'default' | 'success' | 'warning' | 'danger' }>`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background-color: ${(props) => {
    switch (props.$variant) {
      case 'success':
        return '#065f46';
      case 'warning':
        return '#92400e';
      case 'danger':
        return '#7f1d1d';
      default:
        return '#0f3460';
    }
  }};
  color: ${(props) => {
    switch (props.$variant) {
      case 'success':
        return '#dcfce7';
      case 'warning':
        return '#fef3c7';
      case 'danger':
        return '#fee2e2';
      default:
        return '#93c5fd';
    }
  }};
`;

// Reusable Button component
export const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger'; $size?: 'sm' | 'md' | 'lg'; variant?: 'primary' | 'secondary' | 'danger'; size?: 'sm' | 'md' | 'lg' }>`
  padding: ${(props) => {
    const sz = props.$size || props.size;
    switch (sz) {
      case 'sm':
        return '6px 12px';
      case 'lg':
        return '12px 24px';
      default:
        return '8px 16px';
    }
  }};
  background-color: ${(props) => {
    const variant = props.$variant || props.variant;
    switch (variant) {
      case 'secondary':
        return '#0f3460';
      case 'danger':
        return '#f87171';
      default:
        return '#4a7eff';
    }
  }};
  color: ${(props) => {
    const variant = props.$variant || props.variant;
    switch (variant) {
      case 'secondary':
        return '#4a7eff';
      case 'danger':
        return '#ffffff';
      default:
        return '#1a1a2e';
    }
  }};
  border: ${(props) => {
    const variant = props.$variant || props.variant;
    switch (variant) {
      case 'secondary':
        return '1px solid #0f3460';
      default:
        return 'none';
    }
  }};
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: ${(props) => {
    const sz = props.$size || props.size;
    return sz === 'sm' ? '12px' : '14px';
  }};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    ${(props) => {
      const variant = props.$variant || props.variant;
      switch (variant) {
        case 'secondary':
          return 'background-color: #16213e; border-color: #4a7eff;';
        case 'danger':
          return 'background-color: #ef4444;';
        default:
          return 'background-color: #6593ff;';
      }
    }}
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// Reusable Input component
export const Input = styled.input`
  padding: 10px 12px;
  background-color: #0f3460;
  border: 1px solid #0f3460;
  color: #ffffff;
  border-radius: 4px;
  font-size: 14px;

  &::placeholder {
    color: #a0a0a0;
  }

  &:focus {
    outline: none;
    border-color: #4a7eff;
    box-shadow: 0 0 0 3px rgba(74, 126, 255, 0.1);
  }
`;
