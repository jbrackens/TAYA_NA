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
          content="Prediction markets on real-world events. Trade Yes or No on politics, sports, crypto, tech, and entertainment with play points — prices are live probabilities."
        />
        {/* P10 type system (2026-07-12): all fonts are self-hosted woff2
         * (see globals.css @font-face) — no render-blocking Google Fonts
         * stylesheet. Preload the two files needed for first paint. */}
        <link
          rel="preload"
          href="/fonts/Inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Newsreader-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
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
