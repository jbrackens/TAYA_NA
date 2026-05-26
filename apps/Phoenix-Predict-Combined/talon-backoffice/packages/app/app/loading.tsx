export default function Loading() {
  // Minimal skeleton — no logo, no "Loading..." text, no visual disruption.
  // The sidebar and header are already rendered by the layout, so the user
  // sees the full app shell. This skeleton fills the content area silently.
  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="skeleton h-[200px] rounded-[16px]" />
      <div className="flex gap-4">
        <div className="skeleton h-[160px] flex-1 rounded-[12px]" />
        <div className="skeleton h-[160px] flex-1 rounded-[12px]" />
      </div>
      <div className="skeleton h-12 rounded-[8px]" />
      <div className="skeleton h-[120px] rounded-[12px]" />
    </div>
  );
}
