"use client";

import React from "react";

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
    <div className="mx-auto max-w-[800px] px-4 py-8">
      <h1 className="mb-2 text-[28px] font-extrabold text-slate-50">{title}</h1>

      {lastUpdated && (
        <p className="mb-6 text-xs text-slate-500">
          Last updated: {lastUpdated}
        </p>
      )}

      <div className="text-sm leading-[1.75] text-[#D3D3D3]">{children}</div>
    </div>
  );
};

export default StaticPage;
