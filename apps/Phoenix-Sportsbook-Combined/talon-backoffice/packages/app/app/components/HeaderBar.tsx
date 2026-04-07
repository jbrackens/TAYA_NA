"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useDeferredValue,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { useAppSelector, useAppDispatch } from "../lib/store/hooks";
import {
  selectOddsFormat,
  setOddsFormat,
  DisplayOddsEnum,
} from "../lib/store/settingsSlice";
import { selectCurrentBalance } from "../lib/store/cashierSlice";
import { getOddsFormatLabel } from "../lib/utils/odds";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../lib/i18n/config";
import { getEvents, getSports, getLeagues } from "../lib/api/events-client";
import { Event, Sport, League } from "../lib/api/events-client";
import {
  Search as SearchIcon,
  Wallet as WalletIcon,
  Bell as BellIcon,
  Ticket as TicketIcon,
  Globe,
} from "lucide-react";

export const HeaderBar: React.FC = () => {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Event[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [quickSports, setQuickSports] = useState<Sport[]>([]);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);
  const searchRequestIdRef = useRef(0);

  // Auth state — providers are always mounted in layout.tsx
  const { isAuthenticated, user } = useAuth();

  // Redux state — store is always available via StoreProvider in layout.tsx
  const oddsFormat = useAppSelector(selectOddsFormat);
  const walletBalance = useAppSelector(selectCurrentBalance);
  const dispatch = useAppDispatch();

  // i18n
  const { t, i18n, ready } = useTranslation("header");
  const currentLang = i18n.language || "en";
  const tx = useCallback(
    (key: string, fallback: string) =>
      ready ? t(key, { defaultValue: fallback }) : fallback,
    [ready, t],
  );

  // Header tabs array now inside component to use translations
  const HEADER_TABS = [
    { label: tx("TAB_SPORTS_HOME", "Sports Home"), href: "/" },
    { label: tx("TAB_LIVE", "Live"), href: "/live" },
    { label: tx("TAB_STARTING_SOON", "Starting Soon"), href: "/starting-soon" },
  ];

  const isTabActive = useCallback(
    (href: string) => {
      if (href === "/") return pathname === "/";
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname],
  );

  const cycleLang = useCallback(() => {
    const lang = i18n.language || "en";
    const idx = SUPPORTED_LANGUAGES.indexOf(lang);
    const next = SUPPORTED_LANGUAGES[(idx + 1) % SUPPORTED_LANGUAGES.length];
    i18n.changeLanguage(next);
    try {
      localStorage.setItem("phoenix_language", next);
    } catch {}
  }, [i18n]);

  const cycleOddsFormat = useCallback(() => {
    const order = [
      DisplayOddsEnum.DECIMAL,
      DisplayOddsEnum.AMERICAN,
      DisplayOddsEnum.FRACTIONAL,
    ];
    const current = order.indexOf(oddsFormat);
    const next = order[(current + 1) % order.length];
    dispatch(setOddsFormat(next));
  }, [dispatch, oddsFormat]);

  // Handle Escape key to close search overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    if (searchOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [searchOpen]);

  // Auto-focus search input when opened + load quick-browse sports
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (searchOpen && quickSports.length === 0) {
      getSports()
        .then(setQuickSports)
        .catch(() => {});
    }
  }, [searchOpen, quickSports.length]);

  // Debounced search against events API
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    const query = deferredSearchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const requestId = ++searchRequestIdRef.current;
    debounceRef.current = window.setTimeout(async () => {
      try {
        // Pass query to backend for server-side filtering; fall back to
        // client-side filtering in case the backend ignores the param.
        const response = await getEvents({ limit: 50, query });
        const lowerQuery = query.toLowerCase();
        const filtered = response.events.filter(
          (e: Event) =>
            e.homeTeam.toLowerCase().includes(lowerQuery) ||
            e.awayTeam.toLowerCase().includes(lowerQuery) ||
            e.sportKey.toLowerCase().includes(lowerQuery) ||
            e.leagueKey.toLowerCase().includes(lowerQuery),
        );
        if (requestId !== searchRequestIdRef.current) {
          return;
        }
        setSearchResults(filtered.slice(0, 20));
      } catch {
        if (requestId === searchRequestIdRef.current) {
          setSearchResults([]);
        }
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setSearchLoading(false);
        }
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [deferredSearchQuery]);

  return (
    <>
      <header className="ps-topbar">
        {/* Left — Navigation Tabs */}
        <nav className="ps-topbar-tabs">
          {HEADER_TABS.map((tab) => (
            <a
              key={tab.href}
              href={tab.href}
              className={`ps-topbar-tab ${isTabActive(tab.href) ? "active" : ""}`}
            >
              {tab.label}
            </a>
          ))}
        </nav>

        {/* Right — Odds Format, Search, Wallet, My Bets, Account */}
        <div className="ps-topbar-right">
          {/* Odds Format Toggle */}
          <button
            className="ps-odds-format-toggle"
            onClick={cycleOddsFormat}
            title={`Odds: ${getOddsFormatLabel(oddsFormat)} — click to change`}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              background: "rgba(57,255,20,0.08)",
              border: "1px solid rgba(57,255,20,0.2)",
              color: "#39ff14",
              cursor: "pointer",
              letterSpacing: "0.03em",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {getOddsFormatLabel(oddsFormat).toUpperCase()}
          </button>

          {/* Language Toggle */}
          <button
            className="ps-lang-toggle"
            onClick={cycleLang}
            title={`Language: ${currentLang.toUpperCase()} — click to change`}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              color: "#818cf8",
              cursor: "pointer",
              letterSpacing: "0.03em",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Globe size={14} strokeWidth={2} />
            {currentLang.toUpperCase()}
          </button>

          {/* Search */}
          <button
            className="ps-topbar-search"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <SearchIcon size={14} strokeWidth={2} />
            <span>{tx("SEARCH_PLACEHOLDER", "Search events...")}</span>
          </button>

          {isAuthenticated ? (
            <>
              {/* Wallet Balance */}
              <a href="/cashier" className="ps-wallet-badge">
                <WalletIcon size={14} strokeWidth={2} />
                <span>
                  $
                  {typeof walletBalance === "number"
                    ? walletBalance.toFixed(2)
                    : "0.00"}
                </span>
              </a>

              {/* My Bets */}
              <a href="/bets" className="ps-topbar-icon" title="My Bets">
                <TicketIcon size={18} strokeWidth={2} />
              </a>

              {/* Notifications */}
              <button className="ps-topbar-icon" title="Notifications">
                <BellIcon size={18} strokeWidth={2} />
                <span className="badge" />
              </button>

              {/* Avatar / Account */}
              <a href="/account" className="ps-avatar" title="Account">
                {user?.username?.[0]?.toUpperCase() || "U"}
              </a>
            </>
          ) : (
            <>
              <a href="/auth/login" className="ps-btn-login">
                {tx("LOGIN_LINK", "Login")}
              </a>
              <a href="/auth/login?mode=register" className="ps-btn-signup">
                {tx("SIGN_UP_LINK", "Join Now")}
              </a>
            </>
          )}
        </div>
      </header>

      {/* Search Overlay */}
      {searchOpen && (
        <div
          style={{
            position: "fixed",
            top: 60,
            left: 0,
            right: 0,
            zIndex: 999,
            background: "#0f1225",
            borderBottom: "1px solid #1a1f3a",
            padding: "16px 24px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            {/* Search Input */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for events, teams, or leagues..."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 14,
                  backgroundColor: "#1a1f3a",
                  border: "1px solid #2a3150",
                  borderRadius: 6,
                  color: "#e2e8f0",
                  outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#4f46e5";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#2a3150";
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 11,
                  color: "#D3D3D3",
                  pointerEvents: "none",
                }}
              >
                {t("SEARCH_ESC_CLOSE")}
              </div>
            </div>

            {/* Results Area */}
            <div style={{ minHeight: 100, color: "#D3D3D3", fontSize: 14 }}>
              {searchQuery.trim().length < 2 ? (
                /* Quick Browse — show sports when no query */
                <div>
                  {quickSports.length > 0 && (
                    <>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#D3D3D3",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: 8,
                        }}
                      >
                        {t("SEARCH_QUICK_BROWSE")}
                      </div>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                      >
                        {quickSports.map((s: Sport) => (
                          <a
                            key={s.sportKey}
                            href={`/sports/${s.sportKey}`}
                            onClick={() => {
                              setSearchOpen(false);
                              setSearchQuery("");
                            }}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 6,
                              fontSize: 13,
                              background: "#161a35",
                              border: "1px solid #1e2243",
                              color: "#e2e8f0",
                              textDecoration: "none",
                              cursor: "pointer",
                            }}
                          >
                            {s.sportName} ({s.eventCount})
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                  {quickSports.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#D3D3D3",
                        fontSize: 12,
                      }}
                    >
                      {t("SEARCH_START_TYPING")}
                    </div>
                  )}
                </div>
              ) : searchLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px 0",
                    color: "#D3D3D3",
                  }}
                >
                  {t("SEARCH_SEARCHING")}
                </div>
              ) : searchResults.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    maxHeight: 400,
                    overflowY: "auto",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#D3D3D3",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 4,
                    }}
                  >
                    {searchResults.length}{" "}
                    {searchResults.length === 1
                      ? t("SEARCH_RESULT")
                      : t("SEARCH_RESULT_PLURAL")}
                  </div>
                  {searchResults.map((event: Event) => (
                    <a
                      key={event.eventId}
                      href={`/match/${event.fixtureId || event.eventId}`}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        borderRadius: 8,
                        textDecoration: "none",
                        background: "#161a35",
                        border: "1px solid #1e2243",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "#e2e8f0",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {event.homeTeam} vs {event.awayTeam}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#D3D3D3",
                            marginTop: 2,
                          }}
                        >
                          {event.sportKey} · {event.leagueKey}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 4,
                          background:
                            event.status === "in_play"
                              ? "rgba(34,197,94,0.1)"
                              : "rgba(57,255,20,0.1)",
                          color:
                            event.status === "in_play" ? "#22c55e" : "#39ff14",
                        }}
                      >
                        {event.status === "in_play"
                          ? t("SEARCH_STATUS_LIVE")
                          : event.status === "finished"
                            ? t("SEARCH_STATUS_FT")
                            : t("SEARCH_STATUS_UPCOMING")}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ color: "#D3D3D3" }}>
                    {t("SEARCH_NO_RESULTS", { query: searchQuery })}
                  </div>
                  <div style={{ fontSize: 12, color: "#D3D3D3", marginTop: 4 }}>
                    {t("SEARCH_TRY_DIFFERENT")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderBar;
