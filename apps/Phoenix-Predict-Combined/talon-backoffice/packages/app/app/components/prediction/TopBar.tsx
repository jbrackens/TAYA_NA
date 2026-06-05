"use client";

/**
 * TopBar — sticky 64px glass-med strip (DESIGN.md §6 shell structure).
 *
 * Layout: brand lockup · horizontal nav links · search +
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
import { useTranslation } from "react-i18next";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import { logger } from "../../lib/logger";
import { searchMarkets } from "../../lib/marketSearch";
import { useAuth } from "../../hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import {
  selectCurrentBalance,
  setCurrentBalance,
} from "../../lib/store/cashierSlice";
import { getBalance } from "../../lib/api/wallet-client";
import { TierPill } from "./TierPill";
import { LanguageSelector } from "../i18n/LanguageSelector";
import { localizedMarket } from "./market-content";

const api = createPredictionClient();

// Top-level nav. `requiresAuth` items are hidden from logged-out visitors —
// they would either land on a sign-in wall (Portfolio) or render with an
// empty / placeholder state (Leaderboards, Rewards), neither of which makes
// sense as a discoverable destination before login.
const NAV_LINKS: { href: string; labelKey: string; requiresAuth?: boolean }[] =
  [
    { href: "/predict", labelKey: "NAV_MARKETS" },
    { href: "/discover", labelKey: "NAV_DISCOVER" },
    { href: "/live", labelKey: "NAV_LIVE" },
    { href: "/portfolio", labelKey: "NAV_PORTFOLIO", requiresAuth: true },
    { href: "/leaderboards", labelKey: "NAV_LEADERBOARDS", requiresAuth: true },
    { href: "/rewards", labelKey: "NAV_REWARDS", requiresAuth: true },
  ];

const TOP_BAR_CLASS =
  "sticky top-0 z-[100] border-b border-[var(--border-1)] bg-[var(--bg-deep)] [font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif]";

const TOP_BAR_INNER_CLASS =
  "box-border mx-auto flex h-16 w-full max-w-[1588px] items-center gap-6 px-6 max-[900px]:h-16 max-[900px]:gap-3 max-[900px]:px-4";

const TOP_BAR_BRAND_CLASS =
  "inline-flex min-h-11 shrink-0 items-center gap-2 text-[28px] font-normal leading-none tracking-[0.025em] text-[#121114] no-underline [font-family:'Bebas_Neue','Arial_Narrow',Impact,sans-serif] max-[900px]:gap-[7px] max-[900px]:text-2xl";

const TOP_BAR_WORDMARK_CLASS =
  "whitespace-nowrap text-[23px] font-bold leading-none tracking-[-0.01em] text-[var(--t1)] [font-family:'Space_Grotesk',-apple-system,BlinkMacSystemFont,sans-serif] max-[900px]:text-xl";

const TOP_BAR_NAV_CLASS =
  "flex items-center gap-6 border-b border-neutral-200 w-full min-w-0 flex-1 max-[900px]:hidden";

const TOP_BAR_LINK_CLASS =
  "relative pb-3 pt-2 text-sm font-medium border-b-2 transition-all duration-200 no-underline whitespace-nowrap";

const TOP_BAR_LINK_INACTIVE_CLASS =
  "text-neutral-500 !text-neutral-500 border-transparent hover:text-neutral-800 hover:!text-neutral-800 hover:border-neutral-300";

const TOP_BAR_LINK_ACTIVE_CLASS =
  "text-[var(--accent)] !text-[var(--accent)] font-semibold border-[var(--accent)]";

const TOP_BAR_RIGHT_CLASS = [
  "flex shrink-0 items-center gap-2.5",
  "[&_.lang-select-wrap]:relative [&_.lang-select-wrap]:inline-flex [&_.lang-select-wrap]:min-h-10 [&_.lang-select-wrap]:max-w-[190px] [&_.lang-select-wrap]:items-center [&_.lang-select-wrap]:gap-1.5 [&_.lang-select-wrap]:rounded-[var(--r-pill)] [&_.lang-select-wrap]:border [&_.lang-select-wrap]:border-[var(--border-1)] [&_.lang-select-wrap]:bg-[var(--surface-1)] [&_.lang-select-wrap]:px-2.5 [&_.lang-select-wrap]:py-0 [&_.lang-select-wrap]:text-xs [&_.lang-select-wrap]:font-semibold [&_.lang-select-wrap]:text-[var(--t1)]",
  "[&_.lang-select]:absolute [&_.lang-select]:inset-0 [&_.lang-select]:cursor-pointer [&_.lang-select]:opacity-0",
  "[&_.lang-current]:block [&_.lang-current]:overflow-hidden [&_.lang-current]:text-ellipsis [&_.lang-current]:whitespace-nowrap",
  "[&_.sr-only]:absolute [&_.sr-only]:-m-px [&_.sr-only]:h-px [&_.sr-only]:w-px [&_.sr-only]:overflow-hidden [&_.sr-only]:whitespace-nowrap [&_.sr-only]:border-0 [&_.sr-only]:p-0 [&_.sr-only]:[clip:rect(0,0,0,0)]",
  "max-[900px]:[&_.lang-select-wrap]:max-w-14 max-[900px]:[&_.lang-select-wrap]:px-3 max-[900px]:[&_.lang-current]:hidden",
].join(" ");

const TOP_BAR_SEARCH_WRAP_CLASS = "relative max-[900px]:hidden";
const TOP_BAR_SEARCH_LABEL_CLASS = "relative inline-flex items-center";
const TOP_BAR_SEARCH_INPUT_CLASS =
  "h-10 w-[280px] rounded-[var(--r-pill)] border border-[var(--border-1)] bg-[var(--surface-1)] py-0 pl-9 pr-3.5 text-[13px] text-[var(--t1)] outline-none transition-[border-color,box-shadow] duration-[120ms] ease-[ease] placeholder:text-[var(--t3)] focus-visible:border-[var(--accent)] focus-visible:shadow-[0_0_0_2px_var(--accent-soft)] [font-family:inherit]";
const TOP_BAR_SEARCH_ICON_CLASS =
  "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]";
const TOP_BAR_SEARCH_RESULTS_CLASS =
  "absolute left-0 right-0 top-[calc(100%_+_6px)] z-[110] m-0 max-h-[360px] list-none overflow-y-auto rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-1)] p-1 shadow-[0_20px_40px_rgba(0,0,0,0.5)]";
const TOP_BAR_SEARCH_HIT_CLASS =
  "flex cursor-pointer flex-col gap-0.5 rounded-[var(--r-sm)] px-3 py-2";
const TOP_BAR_SEARCH_HIT_INACTIVE_CLASS = "hover:bg-[var(--accent-soft)]";
const TOP_BAR_SEARCH_HIT_ACTIVE_CLASS = "bg-[var(--accent-soft)]";
const TOP_BAR_SEARCH_HIT_TITLE_CLASS =
  "text-[13px] font-semibold text-[var(--t1)]";
const TOP_BAR_SEARCH_HIT_META_CLASS =
  "text-[11px] text-[var(--t3)] tabular-nums [font-family:'IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace]";
const TOP_BAR_SEARCH_EMPTY_CLASS =
  "px-3 py-3.5 text-center text-xs text-[var(--t3)]";

const TOP_BAR_BALANCE_CLASS =
  "inline-flex items-center gap-2 rounded-[var(--r-pill)] bg-[var(--accent-soft)] px-3 py-[7px] text-[13px] font-semibold text-[var(--yes-text)] tabular-nums [font-family:'IBM_Plex_Mono',monospace]";
const TOP_BAR_BALANCE_LABEL_CLASS =
  "text-[11px] font-medium text-[var(--t3)] [font-family:'Inter',sans-serif]";

const TOP_BAR_AVATAR_CLASS =
  "grid size-11 cursor-pointer place-items-center rounded-full border border-[rgba(255,255,255,0.18)] bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.25),transparent_60%),linear-gradient(145deg,#a56bff_0%,#5b38a8_100%)] text-[15px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_6px_rgba(0,0,0,0.3)] hover:brightness-[1.08]";

const TOP_BAR_BUTTON_CLASS =
  "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[var(--r-pill)] border-0 px-4 text-[13px] font-semibold no-underline transition-[transform,filter] duration-150 ease-[ease] [font-family:inherit]";
const TOP_BAR_BUTTON_GHOST_CLASS =
  "bg-transparent text-[var(--t1)] hover:bg-[var(--surface-2)]";
const TOP_BAR_BUTTON_ACCENT_CLASS =
  "bg-[var(--accent)] text-[#061a10] hover:-translate-y-px hover:brightness-[1.05]";

const TOP_BAR_MENU_WRAP_CLASS = "relative";
const TOP_BAR_MENU_CLASS =
  "absolute right-0 top-[calc(100%_+_6px)] z-[110] min-w-[200px] rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-1)] p-1 shadow-[0_20px_40px_rgba(0,0,0,0.5)]";
const TOP_BAR_MENU_ITEM_BASE_CLASS =
  "flex w-full cursor-pointer items-center gap-2 rounded-[var(--r-sm)] border-0 bg-transparent px-3 py-2 text-left text-[13px] no-underline hover:bg-[var(--surface-2)] [font-family:inherit]";
const TOP_BAR_MENU_ITEM_CLASS = `${TOP_BAR_MENU_ITEM_BASE_CLASS} text-[var(--t1)]`;
const TOP_BAR_MENU_LOGOUT_CLASS = `${TOP_BAR_MENU_ITEM_BASE_CLASS} text-[var(--no)]`;
const TOP_BAR_MENU_DIVIDER_CLASS = "my-1 h-px bg-[var(--surface-2)]";

export function TopBar() {
  const { t } = useTranslation("header");
  const { t: contentT } = useTranslation("market-content");
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

  // Mobile-vs-desktop gate. Matches the Tailwind max-[900px] breakpoint so
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

  const searchResults = useMemo(
    () =>
      searchMarkets(
        allMarkets.map((m) => localizedMarket(contentT, m)),
        query,
        8,
      ),
    [query, allMarkets, contentT],
  );

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
      // Next.js routes /predict to /predict/ with the project's trailingSlash
      // config. Strict equality missed that, so the Markets pill stayed
      // gray on its own page while every other tab lit up. Accept either
      // form plus the /category/* subroutes that belong under Markets.
      return (
        pathname === "/predict" ||
        pathname.startsWith("/predict/") ||
        pathname.startsWith("/category/")
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className={TOP_BAR_CLASS}>
      <div className={TOP_BAR_INNER_CLASS}>
        <Link
          href="/predict"
          className={TOP_BAR_BRAND_CLASS}
          aria-label="Tiangge — home"
        >
          <span className={TOP_BAR_WORDMARK_CLASS}>Tiangge</span>
        </Link>

        {isDesktop && (
          <nav className={TOP_BAR_NAV_CLASS} aria-label="Primary">
            {NAV_LINKS.filter((l) => !l.requiresAuth || isAuthenticated).map(
              (l) => {
                const active = isActive(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`${TOP_BAR_LINK_CLASS} ${
                      active
                        ? TOP_BAR_LINK_ACTIVE_CLASS
                        : TOP_BAR_LINK_INACTIVE_CLASS
                    }`}
                  >
                    {t(l.labelKey)}
                  </Link>
                );
              },
            )}
          </nav>
        )}

        <div className={TOP_BAR_RIGHT_CLASS}>
          <div
            className={TOP_BAR_SEARCH_WRAP_CLASS}
            ref={searchRef}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={searchOpen && searchResults.length > 0}
            aria-owns="tb-search-listbox"
            aria-activedescendant={
              searchOpen && searchResults[cursor]
                ? `tb-search-option-${searchResults[cursor].id}`
                : undefined
            }
          >
            <label className={TOP_BAR_SEARCH_LABEL_CLASS}>
              <Search size={14} className={TOP_BAR_SEARCH_ICON_CLASS} />
              <input
                ref={searchInputRef}
                type="search"
                className={TOP_BAR_SEARCH_INPUT_CLASS}
                placeholder={t("SEARCH_MARKETS_PLACEHOLDER")}
                aria-label={t("SEARCH_MARKETS")}
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
                className={TOP_BAR_SEARCH_RESULTS_CLASS}
              >
                {searchResults.length === 0 ? (
                  <li className={TOP_BAR_SEARCH_EMPTY_CLASS} aria-live="polite">
                    {t("SEARCH_NO_MARKETS", { query: query.trim() })}
                  </li>
                ) : (
                  searchResults.map((m, i) => {
                    const active = i === cursor;
                    return (
                      <li
                        key={m.id}
                        id={`tb-search-option-${m.id}`}
                        role="option"
                        aria-selected={active}
                        className={`${TOP_BAR_SEARCH_HIT_CLASS} ${
                          active
                            ? TOP_BAR_SEARCH_HIT_ACTIVE_CLASS
                            : TOP_BAR_SEARCH_HIT_INACTIVE_CLASS
                        }`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          navigateToMarket(m.ticker);
                        }}
                        onMouseEnter={() => setCursor(i)}
                      >
                        <span className={TOP_BAR_SEARCH_HIT_TITLE_CLASS}>
                          {m.title}
                        </span>
                        <span className={TOP_BAR_SEARCH_HIT_META_CLASS}>
                          {t("SEARCH_RESULT_META", {
                            ticker: m.ticker,
                            price: m.yesPriceCents,
                          })}
                        </span>
                      </li>
                    );
                  })
                )}
              </ul>
            )}
          </div>

          {isAuthenticated && <TierPill />}
          <LanguageSelector source={isDesktop ? "header" : "mobile_menu"} />
          {isAuthenticated && (
            <div className={TOP_BAR_BALANCE_CLASS}>
              <span className={TOP_BAR_BALANCE_LABEL_CLASS}>
                {t("BALANCE_LABEL")}
              </span>
              <span>
                {/*
                  Render a placeholder when the balance is undefined
                  (still loading) instead of "$0.00". The literal $0
                  was misleading: on every page navigation, between the
                  initial render and the wallet API resolving (~300ms-3s
                  in dev), the user saw "BAL $0.00" — easy to read as
                  "your account is empty" and panic. A neutral "—"
                  reads as "loading" without claiming a value.
                */}
                {typeof balance === "number" ? `$${balance.toFixed(2)}` : "$—"}
              </span>
            </div>
          )}

          {isLoading ? null : isAuthenticated ? (
            <div className={TOP_BAR_MENU_WRAP_CLASS} ref={menuRef}>
              <button
                type="button"
                className={TOP_BAR_AVATAR_CLASS}
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-label={t("USER_MENU")}
              >
                {initial}
              </button>
              {userMenuOpen && (
                <div className={TOP_BAR_MENU_CLASS} role="menu">
                  <Link
                    href="/account"
                    className={TOP_BAR_MENU_ITEM_CLASS}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <UserIcon size={14} /> {t("NAV_ACCOUNT")}
                  </Link>
                  <Link
                    href="/portfolio"
                    className={TOP_BAR_MENU_ITEM_CLASS}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Wallet size={14} /> {t("NAV_PORTFOLIO")}
                  </Link>
                  <Link
                    href="/account/settings"
                    className={TOP_BAR_MENU_ITEM_CLASS}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings size={14} /> {t("NAV_SETTINGS")}
                  </Link>
                  <div className={TOP_BAR_MENU_DIVIDER_CLASS} />
                  <button
                    type="button"
                    className={TOP_BAR_MENU_LOGOUT_CLASS}
                    onClick={handleLogout}
                  >
                    <LogOut size={14} /> {t("LOG_OUT")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/auth/login"
                className={`${TOP_BAR_BUTTON_CLASS} ${TOP_BAR_BUTTON_GHOST_CLASS}`}
              >
                {t("LOG_IN")}
              </Link>
              <Link
                href="/auth/register"
                className={`${TOP_BAR_BUTTON_CLASS} ${TOP_BAR_BUTTON_ACCENT_CLASS}`}
              >
                {t("SIGN_UP")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
