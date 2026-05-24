"use client";

/**
 * AppShell — root client boundary for the prediction player app.
 *
 * Layout (Liquid Glass shell, DESIGN.md §6):
 *   [TopBar]                ← sticky 64px glass-med strip
 *   [ChatSidebar][content]  ← app-level shell body on desktop
 *
 * BackdropScene is mounted higher up in layout.tsx so it sits behind every
 * route. Chat remains a leaf panel so provider failures cannot block markets.
 */

import React from "react";
import { usePathname } from "next/navigation";
import StoreProvider from "../lib/store/StoreProvider";
import { QueryProvider } from "../lib/query/QueryProvider";
import { I18nProvider } from "../lib/i18n/I18nProvider";
import { AuthProvider } from "./AuthProvider";
import { ToastProvider } from "./ToastProvider";
import { TopBar } from "./prediction/TopBar";
import { PredictFooter } from "./prediction/PredictFooter";
import { BackendStatusBanner } from "./BackendStatusBanner";
import MobileTabBar from "./MobileTabBar";
import { ChatSidebar } from "./chat/ChatSidebar";

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
                <div className="predict-auth-layout">{children}</div>
              ) : (
                <div className="app-shell">
                  <TopBar />
                  <BackendStatusBanner />
                  <div className="app-shell-body">
                    <ChatSidebar />
                    <div className="app-shell-content">
                      <main className="app-shell-main">{children}</main>
                      <PredictFooter />
                    </div>
                  </div>
                  <MobileTabBar />
                </div>
              )}
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </QueryProvider>
    </StoreProvider>
  );
}
