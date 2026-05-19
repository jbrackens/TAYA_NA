"use client";

// AntD v5 + React 19 static-API patch (Modal.confirm/message/notification).
// Phase 0 placement on the client page; Phase 1 centralizes it into a root
// client provider.
import "@ant-design/v5-patch-for-react-19";

// Migrated from pages/prediction-admin/markets.tsx (Pages Router never
// hydrated under Next 16 + React 19 — see FEATURE_MANIFEST
// known_blockers/pages-router-no-hydration). Container unchanged, real
// client code (createPredictionClient -> Go gateway). Shell + AntD CSS
// come from the (dashboard) and prediction-admin layouts. No
// securedPage/getInitialProps — matches the other app-router pages.
import PredictionMarketsContainer from "../../../../containers/prediction-markets";

export default function PredictionMarketsPage() {
  return <PredictionMarketsContainer />;
}
