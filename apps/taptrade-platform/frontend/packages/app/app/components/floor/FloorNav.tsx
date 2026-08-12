"use client";

/**
 * FloorNav — the redesign shell's persistent left navigator (Gate 1 B2).
 * Four destinations; the active one carries the lime edge + wash. Used by
 * /floor and /book (and future Standing/Watchlist stages).
 */

import Link from "next/link";
import { useTranslation } from "react-i18next";

const NAV_ITEM_CLASS =
  "flex min-h-[30px] items-center gap-2 rounded-[6px] px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.09em] no-underline transition-colors duration-150";

function Item({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  const edge = (
    <span
      className={`h-[13px] w-[3px] flex-none rounded-[1px] ${
        active ? "bg-[var(--accent)]" : "bg-[var(--border-2)]"
      }`}
    />
  );
  if (active) {
    return (
      <span
        className={`${NAV_ITEM_CLASS} bg-[var(--accent-soft)] text-[var(--t1)]`}
        aria-current="page"
      >
        {edge}
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${NAV_ITEM_CLASS} text-[var(--t3)] hover:bg-[var(--surface-2)] hover:text-[var(--t1)]`}
    >
      {edge}
      {label}
    </Link>
  );
}

export function FloorNav({ active }: { active: "floor" | "book" | "standing" }) {
  const { t } = useTranslation("prediction");
  return (
    <nav
      className="sticky top-16 flex h-[calc(100vh-64px)] flex-col gap-0.5 border-r border-[var(--border-1)] bg-[var(--surface-1)] px-2.5 pb-5 pt-4 max-[1023px]:hidden"
      aria-label={t("FLOOR_NAV", "Floor navigation")}
    >
      <Item
        href="/floor"
        label={t("FLOOR_NAV_FLOOR", "Floor")}
        active={active === "floor"}
      />
      <Item
        href="/book"
        label={t("FLOOR_NAV_BOOK", "My Book")}
        active={active === "book"}
      />
      <Item
        href="/standing"
        label={t("FLOOR_NAV_STANDING", "Standing")}
        active={active === "standing"}
      />
    </nav>
  );
}
