"use client";

/**
 * AppShell — root client boundary for the prediction player app.
 *
 * Layout (matches the approved design preview — not the sportsbook shell):
 *   [WhaleTicker]           ← slim auto-scrolling band at the top
 *   [PredictHeader]         ← logo + search + auth, with category strip below
 *   [page content]          ← max-width centered
 *
 * No left sidebar. All three researched references (Kalshi, Polymarket,
 * Pariflow) use horizontal category navigation at the top; the sportsbook's
 * .ps-sidebar doesn't belong in fintech/broadcast product.
 */

import React from "react";
import { usePathname } from "next/navigation";
import StoreProvider from "../lib/store/StoreProvider";
import { QueryProvider } from "../lib/query/QueryProvider";
import { I18nProvider } from "../lib/i18n/I18nProvider";
import { AuthProvider } from "./AuthProvider";
import { ToastProvider } from "./ToastProvider";
import { PredictHeader } from "./prediction/PredictHeader";
import { WhaleTicker } from "./prediction/WhaleTicker";
import { BackendStatusBanner } from "./BackendStatusBanner";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/auth/");

  return (
    <StoreProvider>
      <QueryProvider>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              {isAuthRoute ? (
                <div className="ps-auth-layout">{children}</div>
              ) : (
                <div style={{ minHeight: "100vh", background: "var(--s0)" }}>
                  <WhaleTicker />
                  <PredictHeader />
                  <BackendStatusBanner />
                  <main
                    style={{
                      maxWidth: 1440,
                      margin: "0 auto",
                      padding: "24px 24px 80px",
                    }}
                  >
                    {children}
                  </main>
                </div>
              )}
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </QueryProvider>
    </StoreProvider>
  );
}
