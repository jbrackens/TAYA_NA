"use client";

/**
 * AppShell — root client boundary for the prediction player app.
 *
 * Layout (Liquid Glass shell, DESIGN.md §6):
 *   [TopBar]                ← sticky 64px glass-med strip
 *   [page content]          ← max-width centered, transparent wrapper
 *
 * No left sidebar, no top ticker band. BackdropScene is mounted higher
 * up in layout.tsx so it sits behind every route.
 */

import React from "react";
import { usePathname } from "next/navigation";
import StoreProvider from "../lib/store/StoreProvider";
import { QueryProvider } from "../lib/query/QueryProvider";
import { I18nProvider } from "../lib/i18n/I18nProvider";
import { AuthProvider } from "./AuthProvider";
import { ToastProvider } from "./ToastProvider";
import { TopBar } from "./prediction/TopBar";
import { BackendStatusBanner } from "./BackendStatusBanner";
import MobileTabBar from "./MobileTabBar";

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
                <div style={{ minHeight: "100vh", background: "transparent" }}>
                  <TopBar />
                  <BackendStatusBanner />
                  <main
                    style={{
                      maxWidth: 1280,
                      margin: "0 auto",
                      padding: "28px 32px 80px",
                    }}
                  >
                    {children}
                  </main>
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
