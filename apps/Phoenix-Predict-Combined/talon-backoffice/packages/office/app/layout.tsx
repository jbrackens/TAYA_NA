import type { Metadata } from "next";
// AntD v5 is CSS-in-JS. In the App Router this registry handles style
// injection + SSR extraction; without it the cssinjs motion styles
// don't apply and Modal/Drawer enter-leave animations freeze mid-
// transition (rc-motion never sees transitionend). Required for v5.
import { AntdRegistry } from "@ant-design/nextjs-registry";
import AntdConfigProvider from "./lib/antd-config-provider";
import AntdPatch from "./lib/antd-patch";
import StyledComponentsRegistry from "./lib/styled-components-registry";
// P8 design tokens — shared with the Pages Router via the same
// stylesheet so /auth/login (App Router) and /prediction-admin/*
// (Pages Router) paint against one palette. See styles/p8-tokens.css.
import "../styles/p8-tokens.css";

export const metadata: Metadata = {
  title: "TAYA NA! Backoffice | Admin Panel",
  description: "Admin and settlement dashboard for TAYA NA Predict",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <StyledComponentsRegistry>
          <AntdRegistry>
            <AntdPatch>
              <AntdConfigProvider>{children}</AntdConfigProvider>
            </AntdPatch>
          </AntdRegistry>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
