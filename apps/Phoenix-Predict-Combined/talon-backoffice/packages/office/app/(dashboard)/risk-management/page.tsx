import { redirect } from "next/navigation";

/**
 * /risk-management redirects to the prediction-native risk dashboard.
 *
 * The legacy /risk-management/summary subtree (pages/risk-management/*)
 * was a sportsbook-shaped surface: freebet usage, odds-boost
 * breakdowns, bet/stake counts. Visible under the prediction-market
 * brand it reads as a credibility leak, so the index now sends
 * operators directly to /prediction-admin/risk (the prediction-native
 * dashboard from feat/risk-dashboard-v1: cost-basis concentration,
 * settlement aging, money invariants, snapshot-tx safety).
 *
 * The legacy /risk-management/summary URL still resolves for now in
 * case anyone has it bookmarked, but its contents are sportsbook
 * leftovers and should not be used. Removing those pages entirely is
 * tracked as the next follow-up.
 */
export default function RiskManagementIndex() {
  // /prediction-admin/risk ships in PR #48 (feat/risk-dashboard-v1).
  // Until that lands, redirect to /dashboard so /risk-management never
  // shows the sportsbook subtree. After PR #48 merges, change the
  // target to "/prediction-admin/risk".
  redirect("/dashboard");
}
