"use client";

/**
 * PredictHeader — top nav for the prediction platform.
 *
 * Replaces HeaderBar (which carried sportsbook concerns: betslip icon, odds
 * format toggle, BetConstruct event search, sport tabs). This header has:
 *  - brand / home link
 *  - primary nav: Predict, Portfolio, Leaderboards
 *  - wallet balance (only when authenticated)
 *  - user menu (login/register OR account/logout)
 *
 * Keeps the auth state and click-outside patterns from HeaderBar but drops the
 * ~600 lines of sportsbook-specific UI.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  User as UserIcon,
  LogOut,
  Wallet as WalletIcon,
  Settings,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCurrentBalance } from "../../lib/store/cashierSlice";

interface NavItem {
  href: string;
  label: string;
  requiresAuth?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/predict", label: "Markets" },
  { href: "/portfolio", label: "Portfolio", requiresAuth: true },
  { href: "/leaderboards", label: "Leaderboard" },
];

export function PredictHeader() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const balance = useAppSelector(selectCurrentBalance);

  const isActive = useCallback(
    (href: string) => {
      const p = pathname ?? "/";
      return p === href || p.startsWith(`${href}/`);
    },
    [pathname],
  );

  // Close user menu on outside click and Escape
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [userMenuOpen]);

  const handleLogout = useCallback(async () => {
    setUserMenuOpen(false);
    await logout();
  }, [logout]);

  return (
    <header className="border-b border-gray-800 bg-black/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link
          href="/predict"
          className="text-lg font-bold text-white tracking-tight whitespace-nowrap"
        >
          TAYA <span className="text-emerald-400">Predict</span>
        </Link>

        {/* Primary nav */}
        <nav className="hidden sm:flex items-center gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            if (item.requiresAuth && !isAuthenticated) return null;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "text-white bg-gray-800"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Wallet + user menu */}
        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-900 border border-gray-800 text-sm">
              <WalletIcon className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-white font-medium">
                ${typeof balance === "number" ? balance.toFixed(2) : "0.00"}
              </span>
            </div>
          )}

          {isLoading ? (
            <div className="w-20 h-8 bg-gray-800 rounded animate-pulse" />
          ) : isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-semibold">
                  {(user?.username || user?.email || "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <span className="hidden md:inline text-sm text-gray-300">
                  {user?.username || user?.email || "Account"}
                </span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-gray-800 rounded-md shadow-lg py-1">
                  <Link
                    href="/account"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                  >
                    <UserIcon className="w-4 h-4" /> Account
                  </Link>
                  <Link
                    href="/account/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800"
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 text-left"
                  >
                    <LogOut className="w-4 h-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="text-sm text-gray-300 hover:text-white px-3 py-1.5"
              >
                Log in
              </Link>
              <Link
                href="/auth/register"
                className="text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
