export default function SportLoading() {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* League nav bar skeleton */}
      <div style={{
        background: 'linear-gradient(90deg, #161a35 25%, #1e2243 50%, #161a35 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: 10,
        height: 50,
      }} />
      {/* Grid of fixture cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{
            background: 'linear-gradient(90deg, #161a35 25%, #1e2243 50%, #161a35 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: 10,
            height: 120,
          }} />
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}} />
    </div>
  );
}
