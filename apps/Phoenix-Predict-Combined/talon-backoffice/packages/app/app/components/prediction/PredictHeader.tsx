"use client";

/**
 * PredictHeader — slim chrome + horizontal category strip.
 *
 * Top row: logo on left, search in the middle, auth pair on the right.
 * Bottom row: auto-scrolling category chips (All / Trending / Politics / …).
 *
 * The whole chrome is 100–110px tall with backdrop blur so the ticker's
 * translucent background still shows through on scroll. No left sidebar —
 * category navigation lives here and here only.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Wallet, LogOut, User as UserIcon, Settings } from "lucide-react";
import type { Category } from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import { useAuth } from "../../hooks/useAuth";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCurrentBalance } from "../../lib/store/cashierSlice";

const api = createPredictionClient();

export function PredictHeader() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const balance = useAppSelector(selectCurrentBalance);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .getCategories()
      .then((cats) => {
        if (!cancelled) setCategories(cats);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  const initial = (user?.username || user?.email || "?").charAt(0).toUpperCase();
  const isActiveCategory = (slug: string) =>
    pathname?.startsWith(`/category/${slug}`) ?? false;
  const isDiscovery = pathname === "/predict" || pathname === "/predict/";

  return (
    <>
      <style>{`
        .ph {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(17, 24, 39, 0.92);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--b1);
        }
        .ph-row {
          max-width: 1440px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .ph-logo {
          font-weight: 800;
          font-size: 20px;
          letter-spacing: -0.02em;
          color: var(--t1);
          text-decoration: none;
        }
        .ph-logo span { color: var(--accent); }
        .ph-search {
          flex: 1;
          max-width: 480px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          background: var(--s2);
          border: 1px solid var(--b1);
          border-radius: 999px;
          color: var(--t3);
          font-size: 13px;
          transition: all 0.15s;
          cursor: text;
        }
        .ph-search:hover, .ph-search:focus-within {
          border-color: var(--accent);
          box-shadow: var(--accent-glow);
          color: var(--t2);
        }
        .ph-search input {
          flex: 1;
          background: transparent;
          border: 0;
          outline: 0;
          color: inherit;
          font: inherit;
          min-width: 0;
        }
        .ph-right {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ph-wallet {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: var(--s1);
          border: 1px solid var(--b1);
          border-radius: 999px;
          color: var(--t1);
          font-weight: 600;
          font-size: 13px;
        }
        .ph-wallet svg { color: var(--accent); }
        .ph-btn {
          padding: 8px 16px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 13px;
          border: 0;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .ph-btn-ghost { background: transparent; color: var(--t1); }
        .ph-btn-ghost:hover { background: var(--s1); }
        .ph-btn-accent {
          background: var(--accent);
          color: #06222b;
          box-shadow: var(--accent-glow);
        }
        .ph-btn-accent:hover { background: var(--accent-hi); }
        .ph-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-soft);
          color: var(--accent);
          font-weight: 700;
          font-size: 13px;
          border: 1px solid rgba(34,211,238,0.3);
          cursor: pointer;
          transition: all 0.15s;
        }
        .ph-avatar:hover { background: rgba(34,211,238,0.2); }

        .ph-cat-strip {
          border-top: 1px solid var(--b1);
        }
        .ph-cat-row {
          max-width: 1440px;
          margin: 0 auto;
          padding: 10px 24px;
          display: flex;
          gap: 4px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .ph-cat-row::-webkit-scrollbar { display: none; }
        .ph-cat {
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 500;
          color: var(--t2);
          border-radius: 999px;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.15s;
          text-decoration: none;
          border: 0;
          background: transparent;
          font-family: inherit;
        }
        .ph-cat:hover { color: var(--t1); background: var(--s1); }
        .ph-cat.active { color: var(--accent); background: var(--accent-soft); }

        .ph-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 6px);
          min-width: 200px;
          background: var(--s1);
          border: 1px solid var(--b1);
          border-radius: var(--r-md);
          padding: 4px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.45);
          z-index: 60;
        }
        .ph-menu a, .ph-menu button {
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
        .ph-menu a:hover, .ph-menu button:hover { background: var(--s2); }
      `}</style>

      <header className="ph">
        <div className="ph-row">
          <Link href="/predict" className="ph-logo">
            TAYA <span>Predict</span>
          </Link>

          <label className="ph-search">
            <Search size={14} />
            <input
              type="search"
              placeholder="Search markets, candidates, teams…"
              aria-label="Search markets"
            />
          </label>

          <div className="ph-right">
            {isAuthenticated && (
              <div className="ph-wallet">
                <Wallet size={14} />
                <span className="mono">
                  ${typeof balance === "number" ? balance.toFixed(2) : "0.00"}
                </span>
              </div>
            )}

            {isLoading ? null : isAuthenticated ? (
              <div style={{ position: "relative" }} ref={menuRef}>
                <button
                  type="button"
                  className="ph-avatar"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  {initial}
                </button>
                {userMenuOpen && (
                  <div className="ph-menu" role="menu">
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
                        background: "var(--b1)",
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
                <Link href="/auth/login" className="ph-btn ph-btn-ghost">
                  Log in
                </Link>
                <Link href="/auth/register" className="ph-btn ph-btn-accent">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="ph-cat-strip">
          <div className="ph-cat-row">
            <Link
              href="/predict"
              className={`ph-cat ${isDiscovery ? "active" : ""}`}
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className={`ph-cat ${isActiveCategory(c.slug) ? "active" : ""}`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </header>
    </>
  );
}
