import React from "react";
import "./globals.css";
import AppShell from "./components/AppShell";
import { brand } from "./lib/brand";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>{brand.name}</title>
        <meta
          name="description"
          content="Trade Yes or No on politics, basketball, pageants, esports, gaming, and the moments Filipinos are watching."
        />
        {/* Predict design system: Inter (Robinhood-direction primary, added
         * 2026-04-26 per DESIGN.md §2), Inter Tight for display headings,
         * IBM Plex Mono for tabular numerics, Schibsted Grotesk (700 only)
         * for the wordmark (BrandMark/TopBar/footer/register). P12 perf
         * (2026-07-12): dropped Outfit (legacy — only remaining reference
         * was an unreachable fallback behind Inter in globals.css) and
         * Space Grotesk (zero usages); preconnects added so the blocking
         * stylesheet + font files start their handshakes immediately.
         */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter+Tight:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&family=Schibsted+Grotesk:wght@700&display=swap"
          rel="stylesheet"
        />
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
