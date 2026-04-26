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
    <>
      <style>{`
        .pred-section-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin: 32px 0 14px;
        }
        .pred-section-title {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin: 0;
          color: var(--t1);
        }
        .pred-section-link {
          font-size: 13px;
          color: var(--accent);
          text-decoration: none;
          text-shadow: 0 0 6px var(--accent-glow-color);
        }
        .pred-section-link:hover { text-decoration: underline; }
      `}</style>
      <div className="pred-section-head">
        <h2 className="pred-section-title">{title}</h2>
        {href && (
          <a href={href} className="pred-section-link">
            {count != null ? `See all ${count} →` : "See all →"}
          </a>
        )}
      </div>
    </>
  );
}
