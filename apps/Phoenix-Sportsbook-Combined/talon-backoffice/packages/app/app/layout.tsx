"use client";

import React from "react";
import StoreProvider from "./lib/store/StoreProvider";
import { QueryProvider } from "./lib/query/QueryProvider";
import { I18nProvider } from "./lib/i18n/I18nProvider";
import { AuthProvider } from "./components/AuthProvider";
import { BetslipProvider } from "./components/BetslipProvider";
import { SportsSidebar } from "./components/SportsSidebar";
import { HeaderBar } from "./components/HeaderBar";
import { BetslipPanel } from "./components/BetslipPanel";
import { ToastProvider } from "./components/ToastProvider";
import { AccountStatusBar } from "./components/AccountStatusBar";
import OpenChatButton from "./components/OpenChatButton";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>TAYA NA! Sportsbook</title>
        <meta
          name="description"
          content="The ultimate sports betting platform"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=Orbitron:wght@900&display=swap"
          rel="stylesheet"
        />
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PJSSBJG');`,
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PJSSBJG"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <StoreProvider>
          <QueryProvider>
            <I18nProvider>
              <ToastProvider>
                <AuthProvider>
                  <BetslipProvider>
                    <div className="ps-shell">
                      {/* Left Sidebar — Sport Navigation */}
                      <SportsSidebar />

                      {/* Main Area */}
                      <div className="ps-main">
                        <div className="ps-main-inner">
                          {/* Header — Brand, Tabs, Account Controls */}
                          <HeaderBar />

                          {/* Account Status Banner (self-excluded, cooling off, unverified, etc.) */}
                          <AccountStatusBar />

                          <div className="ps-page">{children}</div>
                        </div>
                      </div>
                    </div>
                    <BetslipPanel />
                    <OpenChatButton />
                  </BetslipProvider>
                </AuthProvider>
              </ToastProvider>
            </I18nProvider>
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  );
}

const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #0b0e1c; color: #e2e8f0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  a { color: inherit; text-decoration: none; }
  button { font-family: inherit; }

  /* ── Shell Layout ── */
  .ps-shell { display: flex; min-height: 100vh; }

  /* ── Sidebar (Sport Navigation) ── */
  .ps-sidebar {
    width: 220px; background: #0f1225; border-right: 1px solid #1a1f3a;
    position: fixed; top: 0; bottom: 0; left: 0; z-index: 20;
    display: flex; flex-direction: column; overflow-y: auto;
  }
  .ps-sidebar::-webkit-scrollbar { width: 4px; }
  .ps-sidebar::-webkit-scrollbar-thumb { background: #1a1f3a; border-radius: 2px; }
  .ps-sidebar-brand {
    padding: 16px 20px; display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid #1a1f3a;
  }
  .ps-sidebar-logo {
    width: 36px; height: 36px; border-radius: 6px;
    background: linear-gradient(135deg, #39ff14, #2ed600);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px rgba(46, 214, 0, 0.5);
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }
  .ps-sidebar-logo::before {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 5px;
    border: 1px solid rgba(255,255,255,0.12);
    pointer-events: none;
  }
  .ps-sidebar-logo::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 35%, transparent 100%);
    pointer-events: none;
  }
  .ps-sidebar-logo-mark {
    position: relative;
    width: 22px;
    height: 20px;
    display: block;
    filter: drop-shadow(0 1px 1px rgba(0,0,0,0.18));
    z-index: 1;
  }
  .ps-sidebar-logo-t-top,
  .ps-sidebar-logo-t-stem,
  .ps-sidebar-logo-n-left,
  .ps-sidebar-logo-n-diag,
  .ps-sidebar-logo-n-right {
    position: absolute;
    background: linear-gradient(180deg, #ffffff 0%, #ecfff0 100%);
    border-radius: 1px;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
  }
  .ps-sidebar-logo-t-top {
    top: 1px;
    left: 0;
    width: 12px;
    height: 4px;
  }
  .ps-sidebar-logo-t-stem {
    top: 4px;
    left: 4px;
    width: 4px;
    height: 14px;
  }
  .ps-sidebar-logo-n-left {
    top: 3px;
    left: 11px;
    width: 4px;
    height: 15px;
  }
  .ps-sidebar-logo-n-diag {
    top: 4px;
    left: 13px;
    width: 4px;
    height: 14px;
    transform: skewX(28deg);
    transform-origin: top left;
  }
  .ps-sidebar-logo-n-right {
    top: 3px;
    right: 0;
    width: 4px;
    height: 15px;
  }
  .ps-sidebar-logo-mid-slit {
    position: absolute;
    left: 1px;
    right: 1px;
    top: 10px;
    height: 1px;
    background: rgba(30, 50, 8, 0.28);
    border-radius: 999px;
    pointer-events: none;
  }
  .ps-sidebar-title { font-size: 18px; font-weight: 800; color: #f8fafc; letter-spacing: -0.02em; }
  .ps-sidebar-title span { color: #39ff14; }

  .ps-sidebar-section { padding: 12px 0; }
  .ps-sidebar-section-label {
    padding: 0 20px 8px; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.08em; color: #D3D3D3;
  }
  .ps-sidebar-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 20px; cursor: pointer; transition: all 0.15s;
    border-left: 3px solid transparent; color: #f8fafc; font-size: 13px; font-weight: 500;
    background: none; border-top: none; border-bottom: none; border-right: none; width: 100%; text-align: left;
  }
  .ps-sidebar-item:hover { background: #161a35; color: #ffffff; }
  .ps-sidebar-item.active { background: #1a2040; color: #39ff14; border-left-color: #39ff14; }
  .ps-sidebar-item-left { display: flex; align-items: center; gap: 10px; }
  .ps-sidebar-item-icon { width: 20px; text-align: center; font-size: 15px; }
  .ps-sidebar-badge {
    background: #1e2749; color: #D3D3D3; padding: 2px 8px;
    border-radius: 10px; font-size: 11px; font-weight: 600; min-width: 24px; text-align: center;
  }
  .ps-sidebar-badge.live { background: rgba(239,68,68,0.15); color: #ef4444; }

  /* ── Main Area ── */
  .ps-main { flex: 1; margin-left: 220px; display: flex; flex-direction: column; }

  /* ── Header / Top Bar ── */
  .ps-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; height: 56px; background: #0f1225;
    border-bottom: 1px solid #1a1f3a; position: sticky; top: 0; z-index: 10;
  }
  .ps-topbar-tabs { display: flex; align-items: center; gap: 4px; }
  .ps-topbar-tab {
    padding: 8px 16px; border-radius: 8px; border: none;
    background: transparent; color: #f8fafc; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
  }
  .ps-topbar-tab:hover { background: #161a35; color: #ffffff; }
  .ps-topbar-tab.active { background: #1a2040; color: #39ff14; }

  .ps-topbar-right { display: flex; align-items: center; gap: 12px; }

  .ps-topbar-search {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 14px; border-radius: 8px; border: 1px solid #1a1f3a;
    background: #0b0e1c; color: #D3D3D3; font-size: 13px; cursor: pointer;
    transition: border-color 0.15s; min-width: 180px;
  }
  .ps-topbar-search:hover { border-color: #2a3050; }
  .ps-topbar-search svg { flex-shrink: 0; }

  .ps-wallet-badge {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 14px; border-radius: 8px; background: #1a2040;
    color: #22c55e; font-size: 13px; font-weight: 700;
    border: 1px solid #22c55e30;
  }
  .ps-wallet-badge svg { color: #22c55e; }

  .ps-topbar-icon {
    width: 36px; height: 36px; border-radius: 8px; border: none;
    background: transparent; color: #D3D3D3; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s; font-size: 18px; position: relative;
  }
  .ps-topbar-icon:hover { background: #161a35; color: #ffffff; }
  .ps-topbar-icon .badge {
    position: absolute; top: 2px; right: 2px;
    width: 8px; height: 8px; border-radius: 50%;
    background: #ef4444; border: 2px solid #0f1225;
  }

  .ps-btn-login {
    padding: 8px 18px; border-radius: 8px; border: 1.5px solid #39ff14;
    background: transparent; color: #39ff14; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
  }
  .ps-btn-login:hover { background: rgba(57,255,20,0.1); }
  .ps-btn-signup {
    padding: 8px 18px; border-radius: 8px; border: none;
    background: linear-gradient(135deg, #39ff14, #2ed600); color: #101114;
    font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
    box-shadow: 0 4px 12px rgba(57,255,20,0.25);
  }
  .ps-btn-signup:hover { opacity: 0.9; transform: translateY(-1px); }

  .ps-avatar {
    width: 36px; height: 36px; border-radius: 50%; border: 2px solid #39ff14;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: #39ff14; cursor: pointer;
    background: rgba(57,255,20,0.1); transition: all 0.15s;
  }
  .ps-avatar:hover { background: rgba(57,255,20,0.2); }

  /* ── Main Inner (centered content) ── */
  .ps-main-inner { max-width: 1440px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; min-height: 100vh; }
  .ps-page { flex: 1; padding: 24px; overflow-y: auto; }

  /* ── Betslip Overlay Side-Sheet ── */
  .ps-betslip-overlay {
    position: fixed; top: 0; right: 0; bottom: 0;
    width: 380px; z-index: 30;
    background: #0f1225; border-left: 1px solid #1a1f3a;
    transform: translateX(100%);
    transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
    display: flex; flex-direction: column;
    overflow-y: auto;
  }
  .ps-betslip-overlay.open {
    transform: translateX(0);
    box-shadow: -8px 0 24px rgba(0,0,0,0.4);
  }
  .ps-betslip-backdrop {
    position: fixed; inset: 0; z-index: 29;
    background: rgba(0,0,0,0.5);
    opacity: 0; pointer-events: none;
    transition: opacity 300ms ease;
  }
  .ps-betslip-backdrop.visible {
    opacity: 1; pointer-events: auto;
  }
  .ps-betslip-header {
    padding: 16px 20px; border-bottom: 1px solid #1a1f3a;
    display: flex; align-items: center; justify-content: space-between;
  }
  .ps-betslip-title { font-size: 14px; font-weight: 700; color: #f8fafc; }
  .ps-betslip-count {
    min-width: 22px; height: 22px; border-radius: 6px; padding: 0 6px;
    background: #39ff14; color: #101114; font-size: 11px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .ps-betslip-tabs {
    display: flex; border-bottom: 1px solid #1a1f3a;
  }
  .ps-betslip-tab {
    flex: 1; padding: 10px; border: none; background: transparent;
    color: #D3D3D3; font-size: 12px; font-weight: 600; cursor: pointer;
    transition: all 0.15s; border-bottom: 2px solid transparent;
  }
  .ps-betslip-tab.active { color: #39ff14; border-bottom-color: #39ff14; }
  .ps-betslip-tab:hover { color: #ffffff; }

  .ps-betslip-empty {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: #D3D3D3; padding: 40px 20px; text-align: center;
  }
  .ps-betslip-empty-icon { font-size: 40px; margin-bottom: 16px; opacity: 0.3; }
  .ps-betslip-empty-text { font-size: 13px; font-weight: 500; line-height: 1.6; color: #D3D3D3; }

  .ps-betslip-selection {
    padding: 12px 16px; border-bottom: 1px solid #1a1f3a;
    display: flex; flex-direction: column; gap: 6px;
  }
  .ps-betslip-selection-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .ps-betslip-selection-name { font-size: 13px; font-weight: 600; color: #e2e8f0; }
  .ps-betslip-selection-match { font-size: 11px; color: #D3D3D3; }
  .ps-betslip-selection-market { font-size: 11px; color: #D3D3D3; }
  .ps-betslip-selection-odds { font-size: 14px; font-weight: 700; color: #39ff14; }
  .ps-betslip-remove {
    width: 20px; height: 20px; border-radius: 4px; border: none;
    background: transparent; color: #4a5580; cursor: pointer;
    display: flex; align-items: center; justify-content: center; font-size: 14px;
    transition: all 0.15s;
  }
  .ps-betslip-remove:hover { background: #1a1f3a; color: #ef4444; }

  .ps-betslip-footer {
    padding: 16px; border-top: 1px solid #1a1f3a;
    display: flex; flex-direction: column; gap: 10px;
  }
  .ps-betslip-stake-row { display: flex; align-items: center; gap: 8px; }
  .ps-betslip-stake-label { font-size: 12px; font-weight: 600; color: #D3D3D3; text-transform: uppercase; }
  .ps-betslip-stake-input {
    flex: 1; padding: 8px 12px; border-radius: 6px;
    border: 1px solid #1a1f3a; background: #0b0e1c;
    color: #e2e8f0; font-size: 14px; font-weight: 600;
    text-align: right;
  }
  .ps-betslip-stake-input:focus { outline: none; border-color: #39ff14; }
  .ps-betslip-quick-stakes { display: flex; gap: 6px; }
  .ps-betslip-quick-stake {
    flex: 1; padding: 6px; border-radius: 6px; border: 1px solid #1a1f3a;
    background: #0b0e1c; color: #D3D3D3; font-size: 11px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; text-align: center;
  }
  .ps-betslip-quick-stake:hover { border-color: #39ff14; color: #39ff14; }

  .ps-betslip-summary { display: flex; flex-direction: column; gap: 4px; }
  .ps-betslip-summary-row {
    display: flex; justify-content: space-between; font-size: 12px;
  }
  .ps-betslip-summary-label { color: #D3D3D3; }
  .ps-betslip-summary-value { color: #e2e8f0; font-weight: 600; }
  .ps-betslip-summary-value.green { color: #22c55e; font-size: 15px; }

  .ps-btn-place-bet {
    width: 100%; padding: 12px; border-radius: 8px; border: none;
    background: linear-gradient(135deg, #39ff14, #2ed600); color: #101114;
    font-size: 14px; font-weight: 700; cursor: pointer;
    transition: all 0.15s; box-shadow: 0 4px 16px rgba(57,255,20,0.3);
  }
  .ps-btn-place-bet:hover { opacity: 0.9; transform: translateY(-1px); }
  .ps-btn-place-bet:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .ps-btn-clear {
    width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #1a1f3a;
    background: transparent; color: #D3D3D3; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.15s;
  }
  .ps-btn-clear:hover { border-color: #ef4444; color: #ef4444; }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .ps-shell { flex-direction: column; }
    .ps-sidebar {
      display: flex;
      position: relative;
      width: 100%;
      top: auto;
      bottom: auto;
      left: auto;
      border-right: none;
      border-bottom: 1px solid #1a1f3a;
      max-height: none;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .ps-sidebar-brand {
      min-width: max-content;
      border-bottom: none;
      border-right: 1px solid #1a1f3a;
      padding: 12px 16px;
      position: sticky;
      left: 0;
      background: #0f1225;
      z-index: 2;
    }
    .ps-sidebar-section {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      min-width: max-content;
    }
    .ps-sidebar-section-label {
      display: none;
    }
    .ps-sidebar-item {
      width: auto;
      min-width: max-content;
      padding: 9px 14px;
      border-left: none;
      border-bottom: 2px solid transparent;
      border-radius: 999px;
      background: #161a35;
    }
    .ps-sidebar-item.active {
      border-left-color: transparent;
      border-bottom-color: #39ff14;
    }
    .ps-main { margin-left: 0; }
    .ps-main-inner { min-height: auto; }
    .ps-topbar {
      height: auto;
      min-height: 56px;
      flex-wrap: wrap;
      gap: 10px;
      padding: 12px 16px;
    }
    .ps-topbar-tabs {
      width: 100%;
      overflow-x: auto;
      padding-bottom: 2px;
    }
    .ps-topbar-right {
      width: 100%;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }
    .ps-topbar-search { display: none; }
    .ps-wallet-badge { order: 1; }
    .ps-btn-login, .ps-btn-signup, .ps-avatar { order: 2; }
    .ps-page { padding: 16px; }
    .ps-betslip-overlay { width: 100vw; }
  }
  @media (max-width: 1024px) {
    .ps-sidebar { width: 60px; }
    .ps-sidebar .ps-sidebar-title,
    .ps-sidebar .ps-sidebar-section-label,
    .ps-sidebar .ps-sidebar-item span:not(.ps-sidebar-item-icon),
    .ps-sidebar .ps-sidebar-badge { display: none; }
    .ps-sidebar .ps-sidebar-item { padding: 12px; justify-content: center; }
    .ps-sidebar .ps-sidebar-item-left { gap: 0; }
    .ps-sidebar .ps-sidebar-item-icon { width: auto; font-size: 18px; }
    .ps-sidebar .ps-sidebar-brand { padding: 16px; justify-content: center; }
    .ps-main { margin-left: 60px; }
  }
`;
