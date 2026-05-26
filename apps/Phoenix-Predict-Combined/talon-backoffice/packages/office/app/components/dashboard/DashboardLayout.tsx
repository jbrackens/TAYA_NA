'use client';

import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="grid grid-cols-1 gap-5 min-[641px]:grid-cols-2 min-[1025px]:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
      {children}
    </div>
  );
}
