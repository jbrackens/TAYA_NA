"use client";

// Centralized side-effect import for @ant-design/v5-patch-for-react-19.
// Patches AntD's static Modal.confirm / message / notification APIs to use
// React 19's createRoot via unstableSetRender. The patch must run once,
// client-side, before any consumer hits a static call. Wrapping the App
// Router root layout in <AntdPatch> guarantees that — no per-page imports.
// (See app/layout.tsx for the wire-up; pages/_app.js imports the patch
// directly because the Pages Router doesn't use this provider tree.)
import "@ant-design/v5-patch-for-react-19";

export default function AntdPatch({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
