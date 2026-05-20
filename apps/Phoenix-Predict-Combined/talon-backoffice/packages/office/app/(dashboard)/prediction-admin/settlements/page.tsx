"use client";

// (AntD v5 React-19 patch is loaded centrally via app/lib/antd-patch.tsx,
// wired into app/layout.tsx so every App Router page inherits it.)

// Migrated from pages/prediction-admin/settlements.tsx (Pages Router never
// hydrated under Next 16 + React 19). The container is unchanged, real
// client code (createPredictionClient -> Go gateway). The (dashboard)
// layout supplies the shell; no securedPage/getInitialProps — matches the
// other app-router (dashboard) pages, which have no in-app auth guard
// (office relies on the login flow + Caddy basic_auth on deploy). Re-adding
// role-gating is a separate app-router-wide decision, not invented here.
import PredictionSettlementsContainer from "../../../../containers/prediction-settlements";

export default function PredictionSettlementsPage() {
  return <PredictionSettlementsContainer />;
}
