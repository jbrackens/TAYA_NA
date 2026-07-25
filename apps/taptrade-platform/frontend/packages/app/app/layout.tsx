import type React from "react";
import "./globals.css";
import { GeistMono } from "geist/font/mono";
import AppShell from "./components/AppShell";
import { brand } from "./lib/brand";

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
