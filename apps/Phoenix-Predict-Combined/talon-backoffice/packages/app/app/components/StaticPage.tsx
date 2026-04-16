'use client';

import React from 'react';

interface StaticPageProps {
  title: string;
  children?: React.ReactNode;
  lastUpdated?: string;
}

/**
 * Static page wrapper for content pages (terms, privacy, responsible gaming, etc.).
 * In App Router, each static page is a standalone route, but this wrapper provides
 * consistent styling and layout for static content pages.
 */
export const StaticPage: React.FC<StaticPageProps> = ({
  title,
  children,
  lastUpdated,
}) => {
  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '32px 16px',
      }}
    >
      <h1
        style={{
          fontSize: '28px',
          fontWeight: 800,
          color: '#f8fafc',
          marginBottom: '8px',
        }}
      >
        {title}
      </h1>

      {lastUpdated && (
        <p
          style={{
            fontSize: '12px',
            color: '#64748b',
            marginBottom: '24px',
          }}
        >
          Last updated: {lastUpdated}
        </p>
      )}

      <div
        style={{
          color: '#D3D3D3',
          fontSize: '14px',
          lineHeight: '1.75',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default StaticPage;
