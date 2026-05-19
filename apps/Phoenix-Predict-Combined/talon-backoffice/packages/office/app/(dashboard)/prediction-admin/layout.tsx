// App-Router home for the prediction-admin surfaces (markets, settlements),
// migrated off the Pages Router (which never hydrated under Next 16 +
// React 19 — see FEATURE_MANIFEST known_blockers/pages-router-no-hydration).
//
// The containers are AntD-heavy. AntD v5 is CSS-in-JS (no global
// antd/dist/antd.css — that file does not exist in v5; styles are
// injected at runtime). P8 layering: tokens then the AntD overrides
// (slimmed in Phase 2 as the ConfigProvider theme takes over).
import "../../../styles/p8-tokens.css";
import "../../../styles/p8-antd.css";

export default function PredictionAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
