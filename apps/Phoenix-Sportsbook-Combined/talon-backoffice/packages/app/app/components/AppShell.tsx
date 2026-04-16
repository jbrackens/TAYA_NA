"use client";

import React from "react";
import { usePathname } from "next/navigation";
import StoreProvider from "../lib/store/StoreProvider";
import { QueryProvider } from "../lib/query/QueryProvider";
import { I18nProvider } from "../lib/i18n/I18nProvider";
import { AuthProvider } from "./AuthProvider";
import { BetslipProvider } from "./BetslipProvider";
import { SportsSidebar } from "./SportsSidebar";
import { HeaderBar } from "./HeaderBar";
import { BetslipPanel } from "./BetslipPanel";
import { ToastProvider } from "./ToastProvider";
import { AccountStatusBar } from "./AccountStatusBar";
import { BackendStatusBanner } from "./BackendStatusBanner";
import OpenChatButton from "./OpenChatButton";
import { useBonusSync } from "../hooks/useBonusSync";

/** Syncs bonus/wallet breakdown state into Redux once auth is available */
function BonusSyncEffect() {
  useBonusSync();
  return null;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/auth/");

  return (
    <StoreProvider>
      <QueryProvider>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <BonusSyncEffect />
              <BetslipProvider>
                {isAuthRoute ? (
                  <div className="ps-auth-layout">{children}</div>
                ) : (
                  <>
                    <div className="ps-shell">
                      <SportsSidebar />
                      <div className="ps-main">
                        <div className="ps-main-inner">
                          <HeaderBar />
                          <BackendStatusBanner />
                          <AccountStatusBar />
                          <div className="ps-page">{children}</div>
                        </div>
                      </div>
                    </div>
                    <BetslipPanel />
                    <OpenChatButton />
                  </>
                )}
              </BetslipProvider>
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </QueryProvider>
    </StoreProvider>
  );
}
