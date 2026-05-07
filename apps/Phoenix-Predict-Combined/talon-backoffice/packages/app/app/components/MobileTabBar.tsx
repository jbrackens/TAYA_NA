"use client";

/**
 * MobileTabBar — fixed bottom navigation on mobile (<900px, per D12).
 *
 * 5 slots matching the desktop TopBar nav plus Account. Uses the same
 * warm-light P8 surface system as TopBar, with 48px tap targets and
 * safe-area spacing. Hidden on desktop (nav lives in TopBar there).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  PieChart,
  Trophy,
  Gift,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

type TabDef = {
  href: string;
  label: string;
  Icon: typeof LayoutGrid;
  matchPrefixes?: string[];
};

const TABS: TabDef[] = [
  {
    href: "/predict",
    label: "Markets",
    Icon: LayoutGrid,
    matchPrefixes: ["/predict", "/category/", "/market/"],
  },
  { href: "/portfolio", label: "Portfolio", Icon: PieChart },
  { href: "/leaderboards", label: "Boards", Icon: Trophy },
  { href: "/rewards", label: "Rewards", Icon: Gift },
  {
    href: "/account",
    label: "Account",
    Icon: UserIcon,
    matchPrefixes: ["/account"],
  },
];

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

  return (
    <>
      <style>{`
        .mtb {
          position: fixed;
          left: 12px;
          right: 12px;
          bottom: max(12px, env(safe-area-inset-bottom));
          z-index: 90;
          display: grid;
          grid-template-columns: repeat(${TABS.length}, 1fr);
          padding: 6px;
          border-radius: var(--r-rh-xl);
          background: var(--surface-1);
          border: 1px solid var(--border-1);
          box-shadow: 0 10px 28px rgba(60, 50, 30, 0.14);
        }
        .mtb-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 48px;
          padding: 8px 2px;
          border-radius: var(--r-rh-md);
          color: var(--t3);
          font-family: inherit;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-decoration: none;
          text-align: center;
          transition: color 150ms ease, background 150ms ease;
        }
        .mtb-item:hover { color: var(--t1); background: var(--surface-2); }
        .mtb-item.is-active {
          color: #061a10;
          background: var(--accent);
          font-weight: 700;
        }
        .mtb-icon { display: block; }
        /* Page content lifts above the floating tab bar so last rows
         * aren't clipped on scroll. Paired with max-width main padding. */
        @media (max-width: 899px) {
          main { padding-bottom: calc(108px + env(safe-area-inset-bottom)) !important; }
        }
      `}</style>
      <nav className="mtb" aria-label="Primary (mobile)">
        {TABS.map((t) => {
          const active = matches(pathname, t);
          const Icon = t.Icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`mtb-item ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} className="mtb-icon" aria-hidden="true" />
              <span>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
