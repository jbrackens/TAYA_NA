export default function CashierLoading() {
  return (
    <div
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Balance bar skeleton */}
      <div
        style={{
          background:
            "linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          borderRadius: 12,
          height: 80,
        }}
      />
      {/* Recent transactions skeleton */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background:
              "linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            borderRadius: 10,
            height: 60,
          }}
        />
      ))}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `,
        }}
      />
    </div>
  );
}
