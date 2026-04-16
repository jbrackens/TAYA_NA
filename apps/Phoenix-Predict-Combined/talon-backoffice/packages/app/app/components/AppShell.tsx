"use client";

/**
 * AppShell — root client boundary that composes providers and chrome.
 *
 * Historical note: the previous shell wrapped sportsbook chrome (SportsSidebar,
 * HeaderBar, BetslipProvider, BetslipPanel) around the page. Those components
 * stuck around for reference under app/components/ but are no longer rendered.
 * The prediction chrome (PredictHeader, PredictSidebar, PredictFooter) is
 * thinner and doesn't need a cross-page betslip since each market has its own
 * TradeTicket.
 */

import React from "react";
import { usePathname } from "next/navigation";
import StoreProvider from "../lib/store/StoreProvider";
import { QueryProvider } from "../lib/query/QueryProvider";
import { I18nProvider } from "../lib/i18n/I18nProvider";
import { AuthProvider } from "./AuthProvider";
import { ToastProvider } from "./ToastProvider";
import { PredictHeader } from "./prediction/PredictHeader";
import { PredictSidebar } from "./prediction/PredictSidebar";
import { PredictFooter } from "./prediction/PredictFooter";
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
                <div className="min-h-screen flex items-center justify-center bg-black">
                  {children}
                </div>
              ) : (
                <div className="min-h-screen flex flex-col bg-black text-white">
                  <PredictHeader />
                  <BackendStatusBanner />
                  <div className="flex-1 flex">
                    <PredictSidebar />
                    <main className="flex-1 min-w-0">{children}</main>
                  </div>
                  <PredictFooter />
                </div>
              )}
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </QueryProvider>
    </StoreProvider>
  );
}
