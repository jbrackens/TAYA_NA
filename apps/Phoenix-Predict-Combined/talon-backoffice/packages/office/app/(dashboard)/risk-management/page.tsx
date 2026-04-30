import { redirect } from "next/navigation";

/**
 * /risk-management is a Pages Router subtree (`pages/risk-management/{summary,
 * prediction,markets,...}`) — but it has no index page, so the index URL
 * needs an explicit landing target. Redirect to the summary page, which is
 * the live prediction-shaped risk view.
 *
 * Replaces a previous App Router stub that rendered hardcoded sportsbook
 * sample data (Man United vs Arsenal, fake `totalBets` per player). That
 * stub was a credibility leak in a production admin surface; see the
 * commit message for the retirement rationale.
 *
 * If a real prediction-shaped risk dashboard ships in the future, replace
 * this redirect with that page.
 */
export default function RiskManagementIndex() {
  redirect("/risk-management/summary/");
}
