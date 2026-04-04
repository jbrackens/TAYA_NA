'use client';

import React, { useState } from 'react';

interface CollapseProps {
  title: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

export default function Collapse({
  title,
  children,
  defaultOpen = false,
}: CollapseProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const headerStyle: React.CSSProperties = {
    padding: '12px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    userSelect: 'none',
    fontWeight: '600',
    color: '#e2e8f0',
    fontSize: '14px',
    transition: 'all 0.2s',
  };

  const chevronStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    color: '#f97316',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'transform 0.3s ease',
    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
  };

  const contentWrapperStyle: React.CSSProperties = {
    maxHeight: isOpen ? '1000px' : '0',
    overflow: 'hidden',
    transition: 'max-height 0.3s ease, opacity 0.3s ease',
    opacity: isOpen ? 1 : 0,
  };

  const contentStyle: React.CSSProperties = {
    padding: isOpen ? '12px 0' : '0',
    fontSize: '14px',
    color: '#cbd5e1',
    lineHeight: '1.6',
  };

  return (
    <div>
      <div
        style={headerStyle}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.color = '#f97316';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.color = '#e2e8f0';
        }}
      >
        <span style={chevronStyle}>›</span>
        {title}
      </div>
      <div style={contentWrapperStyle}>
        <div style={contentStyle}>{children}</div>
      </div>
    </div>
  );
}
