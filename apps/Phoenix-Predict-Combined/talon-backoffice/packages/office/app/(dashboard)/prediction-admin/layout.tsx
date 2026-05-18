// App-Router home for the prediction-admin surfaces (markets, settlements),
// migrated off the Pages Router (which never hydrated under Next 16 +
// React 19 — see FEATURE_MANIFEST known_blockers/pages-router-no-hydration).
//
// The containers are AntD-heavy. The App Router root layout only loads
// p8-tokens.css, so AntD's stylesheet must be brought in here. Import order
// mirrors the proven Pages-Router pages/_app.js order:
// antd base -> p8 tokens -> p8 AntD overrides (overrides must win).
import "antd/dist/antd.css";
import "../../../styles/p8-tokens.css";
import "../../../styles/p8-antd.css";

export default function PredictionAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
