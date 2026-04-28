"use client";

/**
 * TopBar — sticky 64px glass-med strip (DESIGN.md §6 shell structure).
 *
 * Layout: BrandMark + brand wordmark · horizontal nav links · search +
 * balance pill + avatar. No category strip — categories moved into the
 * /predict page body as a horizontal chip strip.
 *
 * Renamed from PredictHeader in Phase 3 per plan decision D6. Search,
 * balance, auth menu, and TierPill logic preserved from the prior
 * implementation.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  LogOut,
  User as UserIcon,
  Settings,
  Wallet,
} from "lucide-react";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import { logger } from "../../lib/logger";
import { useAuth } from "../../hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import {
  selectCurrentBalance,
  setCurrentBalance,
} from "../../lib/store/cashierSlice";
import { getBalance } from "../../lib/api/wallet-client";
import { TierPill } from "./TierPill";
import BrandMark from "../BrandMark";

const api = createPredictionClient();

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/predict", label: "Markets" },
  { href: "/discover", label: "Discover" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/rewards", label: "Rewards" },
];

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  const balance = useAppSelector(selectCurrentBalance);

  // Hydrate the cashier slice's currentBalance whenever the user resolves.
  // Without this, the BAL pill in the top nav reads zero on every page
  // except /cashier (which is the only page that previously dispatched
  // setCurrentBalance). Visiting /cashier first would warm the slice, but
  // a fresh navigation to /predict or /portfolio would show $0.00.
  // TopBar mounts on every page, so we fetch once when auth is ready.
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    let cancelled = false;
    getBalance(user.id)
      .then((bal) => {
        if (!cancelled) dispatch(setCurrentBalance(bal.availableBalance));
      })
      .catch((err: unknown) => {
        logger.warn("TopBar", "balance fetch failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, dispatch]);

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [allMarkets, setAllMarkets] = useState<PredictionMarket[]>([]);
  const [cursor, setCursor] = useState(0);

  // Mobile-vs-desktop gate. Matches the CSS breakpoint in .tb below so
  // the nav links + search are removed from the DOM on mobile (not just
  // display:none), which keeps text-based tests deterministic — the
  // same "Rewards" label shouldn't appear twice in DOM order (once in
  // the nav, once in a page kicker). Phase-3 smoke spec relies on this.
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 900px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const loadMarketsIfNeeded = useCallback(async () => {
    if (allMarkets.length > 0) return;
    try {
      const res = await api.getMarkets({ status: "open", pageSize: 100 });
      setAllMarkets(res.data);
    } catch (err: unknown) {
      logger.warn("TopBar", "market index fetch failed", err);
    }
  }, [allMarkets.length]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as PredictionMarket[];
    return allMarkets
      .filter((m) => `${m.ticker} ${m.title}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, allMarkets]);

  useEffect(() => {
    if (!searchOpen) return;
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [searchOpen]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  const navigateToMarket = useCallback(
    (ticker: string) => {
      setSearchOpen(false);
      setQuery("");
      searchInputRef.current?.blur();
      router.push(`/market/${ticker}`);
    },
    [router],
  );

  const handleSearchKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (searchResults.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, searchResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const hit = searchResults[cursor] ?? searchResults[0];
        if (hit) navigateToMarket(hit.ticker);
      }
    },
    [searchResults, cursor, navigateToMarket],
  );

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

  const initial = (user?.username || user?.email || "?")
    .charAt(0)
    .toUpperCase();

  const isActive = (href: string): boolean => {
    if (!pathname) return false;
    if (href === "/predict") {
      return pathname === "/predict" || pathname.startsWith("/category/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <style>{`
        .tb {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 64px;
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 0 32px;
          background: var(--bg-deep);
          border-bottom: 1px solid var(--border-1);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .tb-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 44px;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: var(--t1);
          text-decoration: none;
          flex-shrink: 0;
        }
        .tb-brand-txt { white-space: nowrap; }
        .tb-brand-txt .accent { color: var(--accent); margin-left: 6px; }

        .tb-nav {
          display: flex;
          gap: 6px;
          flex: 1;
          min-width: 0;
        }
        .tb-link {
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          padding: 0 14px;
          border-radius: var(--r-pill);
          font-size: 13px;
          font-weight: 500;
          color: var(--t2);
          text-decoration: none;
          transition: color 180ms ease, background 180ms ease, box-shadow 180ms ease;
          white-space: nowrap;
        }
        .tb-link:hover { color: var(--t1); background: rgba(0,0,0,0.05); }
        .tb-link.is-active {
          color: #04140a;
          background: var(--accent);
          font-weight: 600;
        }

        .tb-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .tb-search-wrap { position: relative; }
        .tb-search-label {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .tb-search {
          width: 280px;
          height: 40px;
          padding: 0 14px 0 36px;
          border-radius: var(--r-pill);
          border: 1px solid var(--border-1);
          background: var(--surface-1);
          color: var(--t1);
          font-family: inherit;
          font-size: 13px;
          outline: none;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }
        .tb-search::placeholder { color: var(--t3); }
        .tb-search:focus-visible {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-soft);
        }
        .tb-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--t3);
          pointer-events: none;
        }
        .tb-search-results {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          list-style: none;
          margin: 0;
          padding: 4px;
          background: var(--surface-1);
          border: 1px solid var(--border-1);
          border-radius: var(--r-rh-md);
          box-shadow: 0 10px 32px rgba(60, 50, 30, 0.12);
          z-index: 110;
          max-height: 360px;
          overflow-y: auto;
        }
        .tb-search-hit {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px 12px;
          border-radius: var(--r-sm);
          cursor: pointer;
        }
        .tb-search-hit.active, .tb-search-hit:hover {
          background: var(--accent-soft);
        }
        .tb-search-hit-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--t1);
        }
        .tb-search-hit-meta { font-size: 11px; color: var(--t3); }
        .tb-search-empty {
          padding: 14px 12px;
          font-size: 12px;
          color: var(--t3);
          text-align: center;
        }

        .tb-balance {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border-radius: var(--r-pill);
          background: var(--accent-soft);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          color: var(--accent);
        }
        .tb-balance .lbl {
          color: var(--t3);
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 500;
        }

        .tb-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 35% 30%, rgba(255,255,255,0.25), transparent 60%),
            linear-gradient(145deg, #a56bff 0%, #5b38a8 100%);
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.25),
            0 2px 6px rgba(0,0,0,0.3);
          display: grid;
          place-items: center;
          font-weight: 700;
          font-size: 13px;
          color: #fff;
          cursor: pointer;
        }
        .tb-avatar:hover { filter: brightness(1.08); }

        .tb-btn {
          min-height: 44px;
          padding: 0 16px;
          border-radius: var(--r-pill);
          font-weight: 600;
          font-size: 13px;
          border: 0;
          cursor: pointer;
          font-family: inherit;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: transform 150ms ease, filter 150ms ease;
        }
        .tb-btn-ghost { background: transparent; color: var(--t1); }
        .tb-btn-ghost:hover { background: rgba(0,0,0,0.05); }
        .tb-btn-accent {
          color: #061a10;
          background: var(--accent);
        }
        .tb-btn-accent:hover { filter: brightness(1.05); transform: translateY(-1px); }

        .tb-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 6px);
          min-width: 200px;
          background: var(--surface-1);
          border: 1px solid var(--border-1);
          border-radius: var(--r-rh-md);
          padding: 4px;
          box-shadow: 0 10px 32px rgba(60, 50, 30, 0.12);
          z-index: 110;
        }
        .tb-menu a, .tb-menu button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: var(--r-sm);
          font-size: 13px;
          color: var(--t1);
          background: transparent;
          border: 0;
          text-decoration: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
        }
        .tb-menu a:hover, .tb-menu button:hover { background: rgba(0,0,0,0.05); }

        /* Mobile: hide nav links + search, keep brand + balance + avatar */
        @media (max-width: 900px) {
          .tb { gap: 12px; padding: 0 16px; }
          .tb-nav { display: none; }
          .tb-search-wrap { display: none; }
        }
      `}</style>

      <header className="tb">
        <Link
          href="/predict"
          className="tb-brand"
          aria-label="TAYA NA Predict — home"
        >
          <BrandMark />
          <span className="tb-brand-txt">
            TAYA<span className="accent">Predict</span>
          </span>
        </Link>

        {isDesktop && (
          <nav className="tb-nav" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`tb-link ${isActive(l.href) ? "is-active" : ""}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="tb-right">
          <div
            className="tb-search-wrap"
            ref={searchRef}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={searchOpen && searchResults.length > 0}
            aria-owns="tb-search-listbox"
          >
            <label className="tb-search-label">
              <Search size={14} className="tb-search-icon" />
              <input
                ref={searchInputRef}
                type="search"
                className="tb-search"
                placeholder="Search markets, candidates, teams…"
                aria-label="Search markets"
                aria-autocomplete="list"
                aria-controls="tb-search-listbox"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => {
                  setSearchOpen(true);
                  void loadMarketsIfNeeded();
                }}
                onKeyDown={handleSearchKey}
              />
            </label>
            {searchOpen && query.trim() !== "" && (
              <ul
                id="tb-search-listbox"
                role="listbox"
                className="tb-search-results"
              >
                {searchResults.length === 0 ? (
                  <li className="tb-search-empty" aria-live="polite">
                    No markets match “{query.trim()}”
                  </li>
                ) : (
                  searchResults.map((m, i) => (
                    <li
                      key={m.id}
                      role="option"
                      aria-selected={i === cursor}
                      className={`tb-search-hit ${i === cursor ? "active" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        navigateToMarket(m.ticker);
                      }}
                      onMouseEnter={() => setCursor(i)}
                    >
                      <span className="tb-search-hit-title">{m.title}</span>
                      <span className="tb-search-hit-meta mono">
                        {m.ticker} · {m.yesPriceCents}¢ YES
                      </span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {isAuthenticated && <TierPill />}
          {isAuthenticated && (
            <div className="tb-balance">
              <span className="lbl">BAL</span>
              <span>
                ${typeof balance === "number" ? balance.toFixed(2) : "0.00"}
              </span>
            </div>
          )}

          {isLoading ? null : isAuthenticated ? (
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                type="button"
                className="tb-avatar"
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-label="User menu"
              >
                {initial}
              </button>
              {userMenuOpen && (
                <div className="tb-menu" role="menu">
                  <Link href="/account" onClick={() => setUserMenuOpen(false)}>
                    <UserIcon size={14} /> Account
                  </Link>
                  <Link
                    href="/portfolio"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Wallet size={14} /> Portfolio
                  </Link>
                  <Link
                    href="/account/settings"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings size={14} /> Settings
                  </Link>
                  <div
                    style={{
                      height: 1,
                      background: "var(--border-1)",
                      margin: "4px 0",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{ color: "var(--no)" }}
                  >
                    <LogOut size={14} /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/auth/login" className="tb-btn tb-btn-ghost">
                Log in
              </Link>
              <Link href="/auth/register" className="tb-btn tb-btn-accent">
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>
    </>
  );
}
