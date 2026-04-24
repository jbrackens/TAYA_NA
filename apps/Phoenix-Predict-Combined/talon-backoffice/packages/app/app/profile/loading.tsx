export default function ProfileLoading() {
  return (
    <div
      style={{
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Avatar skeleton */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background:
            "linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          margin: "0 auto",
        }}
      />
      {/* Name and email skeleton */}
      <div
        style={{
          background:
            "linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          borderRadius: 8,
          height: 20,
          marginBottom: 8,
        }}
      />
      <div
        style={{
          background:
            "linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          borderRadius: 8,
          height: 16,
          width: "70%",
        }}
      />
      {/* Settings fields skeleton */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background:
              "linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            borderRadius: 8,
            height: 12,
            width: "50%",
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
