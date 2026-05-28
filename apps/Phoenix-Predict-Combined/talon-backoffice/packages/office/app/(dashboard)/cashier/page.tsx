"use client";

import dynamic from "next/dynamic";

const CashierReviewPanel = dynamic(
  () => import("../../../containers/provider-ops/cashier-review"),
  { ssr: false },
);

export default function CashierPage() {
  return <CashierReviewPanel />;
}
