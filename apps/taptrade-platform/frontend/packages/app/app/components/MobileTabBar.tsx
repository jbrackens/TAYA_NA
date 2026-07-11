"use client";

/**
 * MobileTabBar — fixed bottom navigation on mobile (<900px, per D12).
 *
 * Uses the same primary nav rules as TopBar: public links are visible to
 * everyone, auth-required links only appear after login. Hidden on desktop
 * because nav lives in TopBar there.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Activity,
  LayoutGrid,
  PieChart,
  Trophy,
  Gift,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { FEATURE_LIVE_MARKETS } from "../lib/features";

type TabDef = {
  href: string;
  labelKey: string;
  Icon: typeof LayoutGrid;
  requiresAuth?: boolean;
  enabled?: boolean;
  matchPrefixes?: string[];
};

const TABS: TabDef[] = [
  {
    href: "/predict",
    labelKey: "NAV_MARKETS",
    Icon: LayoutGrid,
    matchPrefixes: ["/predict", "/category/", "/market/"],
  },
  {
    href: "/discover",
    labelKey: "NAV_DISCOVER",
    Icon: Compass,
    matchPrefixes: ["/discover"],
  },
  {
    href: "/live",
    labelKey: "NAV_LIVE",
    Icon: Activity,
    enabled: FEATURE_LIVE_MARKETS,
    matchPrefixes: ["/live"],
  },
  {
    href: "/portfolio",
    labelKey: "NAV_PORTFOLIO",
    Icon: PieChart,
    requiresAuth: true,
  },
  {
    href: "/leaderboards",
    labelKey: "NAV_LEADERBOARDS",
    Icon: Trophy,
    requiresAuth: true,
  },
  {
    href: "/rewards",
    labelKey: "NAV_REWARDS",
    Icon: Gift,
    requiresAuth: true,
  },
];

const MOBILE_TAB_BAR_CLASS =
  "fixed left-3 right-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-[90] grid rounded-[var(--r-rh-xl)] border border-[var(--border-1)] bg-[var(--surface-1)] p-1.5 shadow-[0_10px_28px_rgba(60,50,30,0.14)]";

const MOBILE_TAB_ITEM_CLASS =
  "flex min-h-12 flex-col items-center justify-center gap-1 rounded-[var(--r-rh-md)] px-0.5 py-2 text-center text-[11px] tracking-[0.02em] no-underline transition-[color,background] duration-150 ease-[ease] [font-family:inherit]";

// Single-line labels: long locale strings (ms "Papan Kedudukan") must
// truncate instead of wrapping into uneven tab heights (P10, 2026-07-12).
const MOBILE_TAB_LABEL_CLASS =
  "line-clamp-1 w-full overflow-hidden text-ellipsis";

const MOBILE_TAB_ITEM_INACTIVE_CLASS =
  "font-semibold text-[var(--t3)] hover:bg-[var(--surface-2)] hover:text-[var(--t1)]";

const MOBILE_TAB_ITEM_ACTIVE_CLASS =
  "bg-[var(--accent-soft)] font-bold text-[var(--accent-text)]";

function gridClassForCount(count: number): string {
  switch (count) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-2";
    case 3:
      return "grid-cols-3";
    case 4:
      return "grid-cols-4";
    case 5:
      return "grid-cols-5";
    case 6:
      return "grid-cols-6";
    default:
      return "grid-cols-1";
  }
}

function matches(pathname: string | null, tab: TabDef): boolean {
  if (!pathname) return false;
  const prefixes = tab.matchPrefixes ?? [tab.href];
  return prefixes.some((p) =>
    p.endsWith("/")
      ? pathname.startsWith(p)
      : pathname === p || pathname.startsWith(`${p}/`),
  );
}

export default function MobileTabBar() {
  const pathname = usePathname();
  const { t } = useTranslation("header");
  const { isAuthenticated } = useAuth();

  // Render only on mobile. Desktop uses TopBar's nav links.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 899px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!isMobile) return null;
  const visibleTabs = TABS.filter(
    (tab) => tab.enabled !== false && (!tab.requiresAuth || isAuthenticated),
  );

  return (
    <nav
      className={`${MOBILE_TAB_BAR_CLASS} ${gridClassForCount(visibleTabs.length)}`}
      aria-label="Primary (mobile)"
    >
      {visibleTabs.map((tab) => {
        const active = matches(pathname, tab);
        const Icon = tab.Icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${MOBILE_TAB_ITEM_CLASS} ${
              active
                ? MOBILE_TAB_ITEM_ACTIVE_CLASS
                : MOBILE_TAB_ITEM_INACTIVE_CLASS
            }`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={18} className="block" aria-hidden="true" />
            <span className={MOBILE_TAB_LABEL_CLASS}>{t(tab.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
