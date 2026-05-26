"use client";

/**
 * SectionHead — shared section title + "see all" link used across the
 * prediction discovery surfaces (/predict, /discover).
 */

interface Props {
  title: string;
  count?: number;
  href?: string;
}

export function SectionHead({ title, count, href }: Props) {
  return (
    <div className="mt-8 mb-[14px] flex items-baseline justify-between">
      <h2 className="m-0 text-[18px] font-bold tracking-[-0.01em] text-[var(--t1)]">
        {title}
      </h2>
      {href && (
        <a
          href={href}
          className="text-[13px] text-[var(--accent)] no-underline [text-shadow:0_0_6px_var(--accent-glow-color)] hover:underline"
        >
          {count != null ? `See all ${count} →` : "See all →"}
        </a>
      )}
    </div>
  );
}
