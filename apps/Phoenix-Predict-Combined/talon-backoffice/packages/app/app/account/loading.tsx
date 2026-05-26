export default function AccountLoading() {
  const blockClass =
    "animate-pulse rounded-xl bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_25%,rgba(255,255,255,0.08)_50%,rgba(255,255,255,0.04)_75%)] bg-[length:200%_100%]";

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
