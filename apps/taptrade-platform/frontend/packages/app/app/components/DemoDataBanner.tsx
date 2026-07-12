"use client";

/**
 * DemoDataBanner — one-line disclosure shown ONLY on deploys that run
 * with NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS (seeded demo boxes). Seeded
 * volume, backdated trades, and leaderboard activity are otherwise
 * indistinguishable from organic markets — a P10 honesty requirement
 * (docs/redesign/03-redesign-spec.md §3.10) is that demo environments
 * say so on the surface, not in a README. Dismissal lasts for the
 * session (sessionStorage), because the disclosure should reappear on
 * a fresh visit.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DEMO_SYNTHETIC_CHARTS } from "../lib/features";

const STORAGE_KEY = "demo-banner-dismissed";

export function DemoDataBanner() {
  const { t } = useTranslation("common");
  const [dismissed, setDismissed] = useState(true); // SSR-safe default: hidden

  useEffect(() => {
    if (!DEMO_SYNTHETIC_CHARTS) return;
    setDismissed(sessionStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (!DEMO_SYNTHETIC_CHARTS || dismissed) return null;

  return (
    <div
      role="note"
      className="flex items-center justify-center gap-3 border-b border-[var(--border-1)] bg-[var(--surface-2)] px-4 py-1.5 text-center text-[12px] text-[var(--t2)]"
    >
      <span>
        {t(
          "DEMO_ENVIRONMENT_NOTE",
          "Demo environment — markets, volume, and activity include seeded data.",
        )}
      </span>
      <button
        type="button"
        className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-[14px] leading-none text-[var(--t3)] hover:bg-[var(--action-soft)] hover:text-[var(--t1)]"
        aria-label={t("DISMISS", "Dismiss")}
        onClick={() => {
          sessionStorage.setItem(STORAGE_KEY, "1");
          setDismissed(true);
        }}
      >
        ×
      </button>
    </div>
  );
}
