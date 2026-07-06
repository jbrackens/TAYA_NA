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

const AUTH_LAYOUT_CLASS =
  "min-h-screen overflow-y-auto bg-transparent before:content-[''] before:pointer-events-none before:fixed before:inset-0 before:z-[-1] before:bg-[radial-gradient(ellipse_at_top,rgba(43,228,128,0.1),transparent_45%),radial-gradient(ellipse_at_bottom_left,var(--yes-soft),transparent_55%)]";

const APP_SHELL_CLASS = "min-h-screen bg-transparent";

const APP_SHELL_BODY_CLASS =
  "flex items-start w-full max-w-[1588px] min-h-[calc(100vh_-_66px)] mx-auto gap-4 px-6 bg-transparent";

const APP_SHELL_CONTENT_CLASS = "flex-[0_1_1280px] min-w-0";

const APP_SHELL_MAIN_CLASS =
  "max-w-[1280px] m-0 pt-7 px-0 pb-20 max-[899px]:pb-[calc(108px_+_env(safe-area-inset-bottom))]";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/auth/");
  const isLandingRoute = pathname === "/";

  return (
    <StoreProvider>
      <QueryProvider>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              {isAuthRoute ? (
                <div className={AUTH_LAYOUT_CLASS}>{children}</div>
              ) : isLandingRoute ? (
                <div className="min-h-screen bg-[var(--bg-deep)] text-[var(--t1)]">
                  {children}
                </div>
              ) : (
                <div className={APP_SHELL_CLASS}>
                  <TopBar />
                  <BackendStatusBanner />
                  <div className={APP_SHELL_BODY_CLASS}>
                    <ChatSidebar />
                    <div className={APP_SHELL_CONTENT_CLASS}>
                      <main className={APP_SHELL_MAIN_CLASS}>{children}</main>
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
