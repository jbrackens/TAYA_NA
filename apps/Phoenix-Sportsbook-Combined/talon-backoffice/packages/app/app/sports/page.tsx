'use client';

import SportSidebar from '../components/SportSidebar';

export default function SportsPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '24px', color: '#ffffff' }}>
        All Sports
      </h1>
      <SportSidebar />
    </div>
  );
}
