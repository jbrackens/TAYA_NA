"use client";

/**
 * MobileTabBar — fixed bottom navigation on mobile (<900px, per D12).
 *
 * 5 slots matching the desktop TopBar nav plus Account. Renders as a
 * sticky .glass.glass-med strip with 48px tap targets; hidden on
 * desktop (nav lives in TopBar there). Active route gets a mint label
 * + mint glow bar above the icon.
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
          bottom: 12px;
          z-index: 90;
          display: grid;
          grid-template-columns: repeat(${TABS.length}, 1fr);
          padding: 6px;
          border-radius: var(--r-xl);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%),
            rgba(10, 8, 32, 0.62);
          backdrop-filter: blur(26px) saturate(180%);
          -webkit-backdrop-filter: blur(26px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.14),
            0 -2px 8px rgba(0, 0, 0, 0.25),
            0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .mtb-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 48px;
          padding: 8px 2px;
          border-radius: var(--r-md);
          color: var(--t3);
          font-family: inherit;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-decoration: none;
          text-align: center;
          transition: color 150ms ease, background 150ms ease;
        }
        .mtb-item:hover { color: var(--t1); background: rgba(255, 255, 255, 0.04); }
        .mtb-item.is-active {
          color: var(--accent);
          background: rgba(43, 228, 128, 0.08);
          box-shadow: inset 0 1px 0 rgba(43, 228, 128, 0.18);
          text-shadow: 0 0 6px var(--accent-glow-color);
        }
        .mtb-item.is-active svg { filter: drop-shadow(0 0 6px var(--accent-glow-color)); }
        .mtb-icon { display: block; }
        /* Page content lifts above the floating tab bar so last rows
         * aren't clipped on scroll. Paired with max-width main padding. */
        @media (max-width: 899px) {
          main { padding-bottom: 96px !important; }
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
