export default function Loading() {
  // Minimal skeleton — no logo, no "Loading..." text, no visual disruption.
  // The sidebar and header are already rendered by the layout, so the user
  // sees the full app shell. This skeleton fills the content area silently.
  return (
    <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      <div style={{ display: "flex", gap: 16 }}>
        <div className="skeleton" style={{ flex: 1, height: 160, borderRadius: 12 }} />
        <div className="skeleton" style={{ flex: 1, height: 160, borderRadius: 12 }} />
      </div>
      <div className="skeleton" style={{ height: 48, borderRadius: 8 }} />
      <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
    </div>
  );
}
