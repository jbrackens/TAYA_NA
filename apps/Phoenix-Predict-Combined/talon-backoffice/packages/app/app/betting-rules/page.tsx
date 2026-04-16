"use client";

import { ContentPageRenderer } from "../components/ContentPage";

const FALLBACK_CONTENT = `
<h1>Betting Rules</h1>
<p style="font-size: 12px; color: #4a5580; margin-bottom: 32px;">Effective: April 2026</p>

<h2>1. General Rules</h2>
<p>All bets are accepted at the odds displayed at the time of confirmation. Once a bet is placed and confirmed, it cannot be cancelled unless a cash-out option is offered. Bets are void if the event is cancelled, abandoned, or not completed within the scheduled timeframe unless otherwise stated.</p>

<h2>2. Single Bets</h2>
<p>A single bet is a wager on one selection. The return is calculated as stake multiplied by the decimal odds at the time of placement.</p>

<h2>3. Parlay (Accumulator) Bets</h2>
<p>A parlay combines multiple selections into one bet. All selections must win for the parlay to pay out. The total odds are the product of all individual odds. If any selection is void, that leg is removed and the parlay recalculated with the remaining selections.</p>

<h2>4. Live (In-Play) Betting</h2>
<p>Live bets are placed on events already in progress. Odds update in real time and may be suspended during critical moments (goals, penalties, etc.). A bet placed during a suspension will be rejected. Time delays may apply to live bets.</p>

<h2>5. Cash Out</h2>
<p>Cash out allows you to settle a bet before the event concludes. The cash-out value is determined by current odds and may be higher or lower than your original stake. Cash-out offers are not guaranteed and may be withdrawn at any time.</p>

<h2>6. Odds Formats</h2>
<p>Odds are available in Decimal (e.g. 2.50), American (e.g. +150), and Fractional (e.g. 3/2) formats. You can switch between formats using the toggle in the header. All internal calculations use decimal odds.</p>

<h2>7. Settlement</h2>
<p>Bets are settled based on official results from the event's governing body. Settlement typically occurs within minutes of event completion. In the event of a dispute, the decision of the governing body is final.</p>

<h2>8. Maximum &amp; Minimum Stakes</h2>
<p>Minimum and maximum stake limits apply to all bets. These limits may vary by sport, event, and market type. Current limits are displayed on the betslip when placing a wager.</p>

<h2>9. Errors</h2>
<p>We reserve the right to void bets placed at obviously incorrect odds due to technical errors. In such cases, bets will be settled at the correct odds or voided with the stake returned.</p>
`;

export default function BettingRulesPage() {
  return (
    <ContentPageRenderer
      slug="betting-rules"
      fallbackContent={FALLBACK_CONTENT}
    />
  );
}
