"use client";

// Centralized AntD v5 ConfigProvider. Two jobs:
//
//   1. P8 design tokens — maps the P8 CSS variables defined in
//      `styles/p8-tokens.css` (warm cream backdrop, mint accent, Robinhood
//      radii, Inter body) into the v5 theme.token map. Additive to
//      `styles/p8-antd.css`: the existing class-selector overrides keep
//      winning thanks to v5's `:where()` zero-specificity wrap (per the
//      AntD migration doc and the Codex review), so we deliberately do
//      NOT set `hashPriority="high"`. The token map fills in AntD-
//      internal class permutations the class overrides don't cover (new
//      components, motion-derived states, computed shadows, etc.).
//
//   2. Reduced-motion — when `prefers-reduced-motion: reduce` is set,
//      disable AntD's motion tokens. Mitigates rc-motion's dependency on
//      `transitionend`, which can be throttled in backgrounded tabs and
//      low-power modes. Modal/Drawer/Tooltip then close instantly.

import React, { useEffect, useMemo, useState } from "react";
import { App, ConfigProvider, type ThemeConfig } from "antd";

// P8 token map. Color values reference CSS vars from `styles/p8-tokens.css`
// (CLAUDE.md forbids hex literals — vars resolve at runtime via the
// generated cssinjs rules). Numeric tokens (radius, control height) are
// plain numbers because some AntD internals do arithmetic on them.
const p8Theme: ThemeConfig = {
  token: {
    // Brand
    colorPrimary: "var(--accent)",
    colorPrimaryHover: "var(--accent-lo)",
    colorPrimaryActive: "var(--accent-lo)",
    colorPrimaryBg: "var(--accent-soft)",
    colorLink: "var(--focus-ring)",
    colorLinkHover: "var(--accent-lo)",

    // Surfaces — warm cream backdrop + white cards + slightly warmer fills
    colorBgLayout: "var(--bg-deep)",
    colorBgContainer: "var(--surface-1)",
    colorBgElevated: "var(--surface-2)",

    // Borders
    colorBorder: "var(--border-1)",
    colorBorderSecondary: "var(--border-2)",

    // Text — AA on cream + white per DESIGN.md §3
    colorText: "var(--t1)",
    colorTextSecondary: "var(--t2)",
    colorTextTertiary: "var(--t3)",
    colorTextQuaternary: "var(--t4)",

    // Status — yes/no use the AA-passing text variants, not the bright fills
    colorSuccess: "var(--yes-text)",
    colorWarning: "var(--warn)",
    colorError: "var(--danger)",
    colorInfo: "var(--focus-ring)",

    // Radii (Robinhood scale; mirrors --r-rh-*)
    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    borderRadiusXS: 4,

    // Type — Inter body to match `styles/p8-tokens.css` body rule
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  // P8 Layout component tokens.
  // AntD v5 Layout.Header defaults headerBg to '#001529' (dark navy) in its
  // CSS-in-JS token map (antd/lib/layout/style/index.js). Because v5 CSS-in-JS
  // rules are injected at runtime they win by insertion order over any static
  // class-selector override in p8-antd.css. Overriding here, at the token
  // level, is the correct v5 escape hatch — it patches the CSS variable before
  // the rule is written to the document, so there is no specificity race.
  components: {
    Layout: {
      // Header chrome — cream surface matching the P8 backdrop.
      headerBg: "var(--surface-1)",
      // Sider chrome — also cream; aligns with the styled-component sidebar.
      siderBg: "var(--surface-1)",
      // Page body — deep cream backdrop (matches colorBgLayout above).
      bodyBg: "var(--bg-deep)",
    },
    // Same v5 CSS-in-JS escape hatch as Layout above: the Table header cell
    // background is injected at runtime and was winning over the static
    // p8-antd.css `.ant-table-thead th` rule (rendering black header cells).
    // Patch the tokens here so AntD emits the cream values directly.
    Table: {
      headerBg: "var(--surface-2)",
      headerColor: "var(--t2)",
      colorBgContainer: "var(--surface-1)",
      rowHoverBg: "var(--surface-2)",
      borderColor: "var(--border-1)",
    },
  },
};

export default function AntdConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const theme = useMemo<ThemeConfig>(
    () =>
      reduceMotion
        ? { ...p8Theme, token: { ...p8Theme.token, motion: false } }
        : p8Theme,
    [reduceMotion],
  );

  // `<App>` provides the message/notification/modal contexts that
  // `App.useApp()` consumes. Required for v5's static-API replacement
  // — without it, every `message.*` callsite logs:
  //   "Static function can not consume context like dynamic theme.
  //    Please use 'App' component instead."
  // Wrapping here covers both the App Router (app/layout.tsx) and the
  // Pages Router (pages/_app.js) since both render through this provider.
  return (
    <ConfigProvider theme={theme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
