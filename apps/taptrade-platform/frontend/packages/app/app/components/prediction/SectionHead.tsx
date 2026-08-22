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
      <h2 className="type-display m-0 text-[19px] font-semibold text-[var(--t1)]">
        {title}
      </h2>
      {href && (
        <a
          href={href}
          className="text-[13px] font-semibold text-[var(--accent-text)] no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
        >
          {count != null ? `See all ${count} →` : "See all →"}
        </a>
      )}
    </div>
  );
}
