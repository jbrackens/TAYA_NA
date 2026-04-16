"use client";

import { ContentPageRenderer } from "../components/ContentPage";

const FALLBACK_CONTENT = `
<h1>Responsible Gaming</h1>
<p style="font-size: 12px; color: #4a5580; margin-bottom: 32px;">Last updated: April 2026</p>

<h2>Our Commitment</h2>
<p>We are committed to responsible gaming. Use the tools below to manage your gambling activity and set personal limits.</p>

<h2>Set Limits</h2>
<p>You can set deposit, stake, and session limits at any time from your account settings. Deposit and stake limits can be set on a daily, weekly, or monthly basis. Session limits control how long you can remain active on the platform.</p>

<h2>Cool Off Periods</h2>
<p>Take a break from gambling by activating a cool off period. During this time, you will not be able to place any bets. Cool off periods range from 1 day to 30 days and cannot be reversed early.</p>

<h2>Self-Exclusion</h2>
<p>Self-exclusion permanently closes your account and prevents you from creating new accounts. This action cannot be undone. If you choose to self-exclude, you will lose access to your account, including any remaining balance.</p>

<h2>Problem Gambling Warning Signs</h2>
<p>If you recognize any of the following behaviors, it may be time to seek help:</p>
<ul>
<li>Spending more money or time on gambling than you can afford</li>
<li>Difficulty controlling or stopping gambling once you start</li>
<li>Feeling restless or irritable when trying to stop gambling</li>
<li>Gambling to escape problems or relieve feelings of anxiety or depression</li>
<li>Chasing losses by betting more to recover money already lost</li>
<li>Lying to family members or others about how much you gamble</li>
<li>Borrowing money or selling possessions to fund gambling</li>
<li>Neglecting work, school, or family responsibilities due to gambling</li>
<li>Risking or losing important relationships because of gambling</li>
<li>Feeling guilty or ashamed about your gambling behavior</li>
</ul>

<h2>Helplines &amp; Resources</h2>
<p><strong>1-800-GAMBLER</strong> &mdash; 24/7 confidential helpline for problem gamblers. Phone: 1-800-426-2537. Website: <a href="https://www.1800gambler.net">www.1800gambler.net</a></p>
<p><strong>National Council on Problem Gambling (NCPG)</strong> &mdash; National helpline and online chat support. Phone: 1-800-522-4700. Website: <a href="https://www.ncpgambling.org">www.ncpgambling.org</a></p>
<p><strong>Gamblers Anonymous</strong> &mdash; Peer support and 12-step recovery program for compulsive gamblers. Website: <a href="https://www.gamblersanonymous.org">www.gamblersanonymous.org</a></p>
<p><strong>GamStop (UK Self-Exclusion)</strong> &mdash; Free self-exclusion service for UK-licensed online gambling. Website: <a href="https://www.gamstop.co.uk">www.gamstop.co.uk</a></p>

<h2>Patron Protection</h2>
<p>TAYA NA! is committed to protecting our players. We implement the following measures:</p>
<ul>
<li>Age verification to prevent underage gambling (18+ / 21+ depending on jurisdiction)</li>
<li>Deposit, stake, and session limits that you can set and adjust at any time</li>
<li>Cool-off periods and permanent self-exclusion options</li>
<li>Transaction monitoring to detect unusual or harmful patterns</li>
<li>Mandatory responsible gaming messaging in all promotional materials</li>
<li>Staff training on responsible gaming and problem gambling indicators</li>
</ul>

<h2>Dispute Resolution</h2>
<p>If you have a complaint or dispute regarding your account, transactions, or betting outcomes, please follow these steps:</p>
<ol>
<li><strong>Contact Support:</strong> Reach out to our customer support team via live chat or email at <a href="mailto:support@tayanasportsbook.com">support@tayanasportsbook.com</a>. We aim to resolve most issues within 48 hours.</li>
<li><strong>Formal Complaint:</strong> If you are not satisfied with the initial response, submit a formal written complaint. We will acknowledge it within 24 hours and provide a final response within 8 weeks.</li>
<li><strong>Independent Mediation:</strong> If the complaint remains unresolved, you may refer the matter to an independent dispute resolution body as specified by your local gaming authority.</li>
<li><strong>Regulatory Authority:</strong> You may also contact the relevant gaming regulatory authority in your jurisdiction to file a formal complaint.</li>
</ol>
`;

export default function ResponsibleGamingPage() {
  return (
    <ContentPageRenderer
      slug="responsible-gaming"
      fallbackContent={FALLBACK_CONTENT}
    />
  );
}
