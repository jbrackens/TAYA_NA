export default function CashierLoading() {
  const blockClass =
    "animate-pulse bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_25%,rgba(255,255,255,0.08)_50%,rgba(255,255,255,0.04)_75%)] bg-[length:200%_100%]";

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Balance bar skeleton */}
      <div className={`${blockClass} h-20 rounded-xl`} />
      {/* Recent transactions skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} className={`${blockClass} h-[60px] rounded-[10px]`} />
      ))}
    </div>
  );
}
