"use client";

/**
 * FloorTabBar — the redesign's native mobile shell (Gate 1 B6): a fixed
 * bottom tab bar below 1024px on the floor surfaces. Floor · My Book ·
 * ⌘K (opens the command palette via the shell event) · Standing. The
 * active tab carries the lime dot-bar; 44px targets throughout.
 */

import Link from "next/link";
import { useTranslation } from "react-i18next";

export const OPEN_PALETTE_EVENT = "taptrade:open-command-palette";

function Tab({
  href,
  label,
  active,
  onClick,
}: {
  href?: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span
        className={`h-[3px] w-3.5 rounded-[2px] ${
          active ? "bg-[var(--accent)]" : "bg-[var(--border-1)]"
        }`}
        aria-hidden="true"
      />
      <span
        className={`font-mono text-[8.5px] font-semibold uppercase tracking-[0.08em] ${
          active ? "text-[var(--t1)]" : "text-[var(--t3)]"
        }`}
      >
        {label}
      </span>
    </>
  );
  const cls =
    "flex min-h-11 min-w-16 cursor-pointer flex-col items-center justify-center gap-1 border-0 bg-transparent no-underline";
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  }
  return (
    <Link
      href={href ?? "/floor"}
      className={cls}
      aria-current={active ? "page" : undefined}
    >
      {inner}
    </Link>
  );
}

export function FloorTabBar({
  active,
}: {
  active: "floor" | "book" | "standing";
}) {
  const { t } = useTranslation("prediction");
  return (
    <nav
      aria-label={t("FLOOR_NAV", "Floor navigation")}
      className="fixed inset-x-0 bottom-0 z-[85] hidden items-center justify-around border-t border-[var(--border-1)] bg-[var(--surface-1)] px-2 pb-[env(safe-area-inset-bottom)] max-[1023px]:flex"
    >
      <Tab
        href="/floor"
        label={t("FLOOR_NAV_FLOOR", "Floor")}
        active={active === "floor"}
      />
      <Tab
        href="/book"
        label={t("FLOOR_NAV_BOOK", "My Book")}
        active={active === "book"}
      />
      <Tab
        label="⌘K"
        onClick={() =>
          window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT))
        }
      />
      <Tab
        href="/standing"
        label={t("FLOOR_NAV_STANDING", "Standing")}
        active={active === "standing"}
      />
    </nav>
  );
}
