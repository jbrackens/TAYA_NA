"use client";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

interface LoadingSpinnerProps {
  centered?: boolean;
  text?: string;
}

export function LoadingSpinner({
  centered = true,
  text = "Loading...",
}: LoadingSpinnerProps) {
  return (
    <div
      className={cx(
        "flex items-center justify-center",
        centered && "min-h-[400px]",
      )}
    >
      <div>
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[var(--border-1,#e5dfd2)] border-t-[var(--accent,#2be480)]" />
        {text && (
          <p className="m-0 mt-3 text-center text-sm text-[var(--t3,#8b8378)]">
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

interface SkeletonProps {
  count?: number;
}

const skeletonLineClass =
  "mb-3 h-4 animate-pulse rounded-md bg-[linear-gradient(90deg,var(--surface-2,#fcfaf5)_25%,var(--border-1,#e5dfd2)_50%,var(--surface-2,#fcfaf5)_75%)] bg-[length:200%_100%] last:mb-0";

export function SkeletonLoader({ count = 3 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="mb-3 rounded-xl border border-[var(--border-1,#e5dfd2)] bg-[var(--surface-1,#ffffff)] p-4"
          key={index}
        >
          <div className={`${skeletonLineClass} w-4/5`} />
          <div className={`${skeletonLineClass} w-3/5`} />
          <div className={`${skeletonLineClass} w-[70%]`} />
        </div>
      ))}
    </>
  );
}

export default LoadingSpinner;
