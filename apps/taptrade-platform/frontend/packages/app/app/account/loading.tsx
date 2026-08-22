export default function AccountLoading() {
  const blockClass =
    "animate-pulse rounded-xl bg-[linear-gradient(90deg,var(--raised)_25%,var(--card)_50%,var(--raised)_75%)] bg-[length:200%_100%]";

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header bar skeleton */}
      <div className={`${blockClass} h-[60px]`} />
      {/* Section blocks skeleton */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`${blockClass} h-[100px]`} />
      ))}
    </div>
  );
}
