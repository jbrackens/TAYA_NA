export default function MatchLoading() {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Match header skeleton */}
      <div style={{
        background: 'linear-gradient(90deg, #161a35 25%, #1e2243 50%, #161a35 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: 14, height: 120,
      }} />
      {/* Markets skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          background: 'linear-gradient(90deg, #161a35 25%, #1e2243 50%, #161a35 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          borderRadius: 10, height: 80,
        }} />
      ))}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}} />
    </div>
  );
}
