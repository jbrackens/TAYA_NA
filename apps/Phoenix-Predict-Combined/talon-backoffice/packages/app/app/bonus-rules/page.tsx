"use client";

import { ContentPageRenderer } from "../components/ContentPage";

const FALLBACK_CONTENT = `
<h1>Bonus Rules &amp; Wagering Requirements</h1>
<h2>Welcome Bonus</h2>
<p>New players may receive a deposit match bonus up to the maximum amount specified in the campaign. Bonus funds are credited to your bonus balance upon qualifying deposit.</p>

<h2>Wagering Requirements</h2>
<p>Bonus funds carry a wagering requirement (turnover multiplier) before they can be converted to withdrawable real money. Only settled bets with qualifying odds count toward wagering progress.</p>

<h2>Qualifying Bets</h2>
<p>Bets must meet minimum odds requirements to count toward wagering. Void, cancelled, and cashed-out bets do not contribute. Parlay bets may contribute at a different rate than singles.</p>

<h2>Expiry</h2>
<p>Bonuses expire after the period specified in the campaign terms. Unused bonus funds are forfeited upon expiry.</p>

<h2>Restrictions</h2>
<p>One bonus per player per campaign. Withdrawals while a bonus is active may result in bonus forfeiture depending on campaign rules.</p>
`;

export default function BonusRulesPage() {
  return (
    <ContentPageRenderer
      slug="bonus-rules"
      fallbackContent={FALLBACK_CONTENT}
    />
  );
}
