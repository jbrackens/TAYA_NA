import React from "react";
import "./globals.css";
import AppShell from "./components/AppShell";
import BackdropScene from "./components/BackdropScene";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>TAYA NA Predict</title>
        <meta
          name="description"
          content="Trade on the outcome of real-world events — politics, crypto, sports, and more."
        />
        {/* Predict design system: Inter (Robinhood-direction primary, added
         * 2026-04-26 per DESIGN.md §2). Outfit kept loaded for components
         * that haven't migrated yet (will be removed at the end of the
         * P2-P6 sweep). IBM Plex Mono for tabular numerics.
         */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter+Tight:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
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
        <BackdropScene />
        {process.env.NODE_ENV === "production" && (
          <noscript>
            <iframe
              src="https://www.googletagmanager.com/ns.html?id=GTM-PJSSBJG"
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
