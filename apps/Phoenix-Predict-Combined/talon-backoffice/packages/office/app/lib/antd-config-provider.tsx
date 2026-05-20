"use client";

// Centralized AntD v5 ConfigProvider. Phase 1 scope: honor
// `prefers-reduced-motion: reduce` by disabling AntD's motion tokens so
// Modal / Drawer / Tooltip / Popover close instantly. The motivation is
// not pure preference — rc-motion's close path depends on the
// `transitionend` event, which can be throttled in backgrounded tabs or
// low-power modes (verified in headless Claude_Preview, plausible in
// real browsers). Disabling motion sidesteps the entire transitionend
// dependency for users who opted into reduced motion.
//
// Phase 2 extends this same provider with the P8 design tokens read
// from `styles/p8-tokens.css` (colors, radii, controls, fonts) so the
// 92 .ant-* overrides in p8-antd.css can be slimmed.

import React, { useEffect, useState } from "react";
import { ConfigProvider } from "antd";

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

  return (
    <ConfigProvider
      theme={reduceMotion ? { token: { motion: false } } : undefined}
    >
      {children}
    </ConfigProvider>
  );
}
