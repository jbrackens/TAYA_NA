import type React from "react";
import "./globals.css";
import { GeistMono } from "geist/font/mono";
import AppShell from "./components/AppShell";
import { brand } from "./lib/brand";
import { SUSPENSE_REVEAL_BOOTSTRAP } from "./lib/suspense-reveal-bootstrap";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistMono.variable}>
      <head>
        <title>{brand.name}</title>
        <meta
          name="description"
          content="Trade Yes or No on politics, basketball, pageants, esports, gaming, and the moments Filipinos are watching."
        />
        {/* Ink & lime type pivot, step 2 (handoff spec §1, 2026-07-26):
         * two families, both self-hosted, zero third-party font requests.
         * Switzer (Fontshare, self-hosted woff2 in public/fonts/, declared
         * via @font-face in globals.css) carries display, UI and body;
         * Geist Mono (geist npm package → --font-geist-mono on <html>)
         * carries every numeric with tabular figures. Removed: the Google
         * Fonts stylesheet (Inter, Inter Tight, IBM Plex Mono, Schibsted
         * Grotesk) and its preconnects, Geist Sans (its only consumer was
         * the .predict-terminal font override deleted in step 1), and the
         * Martian Grotesk wordmark font (148KB of variable font for eight
         * letters — the wordmark is now Switzer 600 lowercase). */}
        {/* Streamed-Suspense reveal bootstrap: React 19.2 defers the
         * $RC("B:n","S:n") payload swap to requestAnimationFrame, which
         * never fires on hidden pages (background tab, prerender, headless
         * audit) — hydration then client-renders the boundary and the S:n
         * payload div is left orphaned, doubling the DOM until first paint.
         * This flushes React's own $RV queue while hidden. Inert on visible
         * loads. See app/lib/suspense-reveal-bootstrap.ts for the full
         * mechanism write-up. */}
        <script dangerouslySetInnerHTML={{ __html: SUSPENSE_REVEAL_BOOTSTRAP }} />
        {process.env.NODE_ENV === "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PJSSBJG');`,
            }}
          />
        )}
      </head>
      <body>
        {process.env.NODE_ENV === "production" && (
          <noscript>
            <iframe
              src="https://www.googletagmanager.com/ns.html?id=GTM-PJSSBJG"
              title="Google Tag Manager"
              height="0"
              width="0"
              className="hidden invisible"
            />
          </noscript>
        )}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
