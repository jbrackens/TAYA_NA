'use client';

import LiveNow from '../components/LiveNow';

export default function LivePage() {
  return (
    <div>
      <h1 style={{
        fontSize: '28px',
        fontWeight: 700,
        marginBottom: '24px',
        color: '#ffffff',
      }}>
        Live Matches
      </h1>
      <LiveNow />
    </div>
  );
}
