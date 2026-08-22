export default function ProfileLoading() {
  const blockClass =
    "animate-pulse bg-[linear-gradient(90deg,var(--raised)_25%,var(--card)_50%,var(--raised)_75%)] bg-[length:200%_100%]";

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Avatar skeleton */}
      <div className={`${blockClass} mx-auto h-20 w-20 rounded-full`} />
      {/* Name and email skeleton */}
      <div className={`${blockClass} mb-2 h-5 rounded-lg`} />
      <div className={`${blockClass} h-4 w-[70%] rounded-lg`} />
      {/* Settings fields skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} className={`${blockClass} h-3 w-1/2 rounded-lg`} />
      ))}
    </div>
  );
}
