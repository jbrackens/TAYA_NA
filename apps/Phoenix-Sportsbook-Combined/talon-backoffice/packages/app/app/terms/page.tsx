"use client";

import { ContentPageRenderer } from "../components/ContentPage";

const FALLBACK_CONTENT = `
<h1>Terms &amp; Conditions</h1>
<p style="font-size: 12px; color: #4a5580; margin-bottom: 32px;">Effective: April 2026</p>

<h2>1. Acceptance of Terms</h2>
<p>By accessing or using TAYA NA!, you agree to be bound by these Terms and Conditions. If you do not agree, you must not use the platform.</p>

<h2>2. Eligibility</h2>
<p>You must be at least the minimum legal age for gambling in your jurisdiction to use this service. You are responsible for ensuring that your use of the platform complies with all applicable local laws and regulations.</p>

<h2>3. Account Registration</h2>
<p>You may only maintain one account. All information provided must be accurate and kept up to date. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.</p>

<h2>4. Deposits &amp; Withdrawals</h2>
<p>Deposits are processed using accepted payment methods. Withdrawals are subject to identity verification and may take up to 5 business days. We reserve the right to request documentation for compliance with anti-money laundering regulations.</p>

<h2>5. Betting Rules</h2>
<p>All bets are subject to the rules published on the Betting Rules page. Odds are subject to change until a bet is confirmed. Once placed and confirmed, a bet cannot be cancelled unless a cash-out option is available.</p>

<h2>6. Responsible Gaming</h2>
<p>We are committed to responsible gambling. Tools including deposit limits, session limits, cool-off periods, and self-exclusion are available in your account settings. If you believe you may have a gambling problem, please visit our Responsible Gaming page.</p>

<h2>7. Limitation of Liability</h2>
<p>TAYA NA! is provided "as is" without warranties of any kind. We are not liable for any losses incurred through the use of the platform, including but not limited to losses from technical failures, interrupted service, or incorrect odds display.</p>

<h2>8. Modifications</h2>
<p>We reserve the right to modify these Terms at any time. Continued use of the platform after changes constitutes acceptance of the revised Terms.</p>

<h2>9. Contact</h2>
<p>Questions about these Terms may be directed to <a href="mailto:legal@tayanasportsbook.com">legal@tayanasportsbook.com</a>.</p>
`;

export default function TermsPage() {
  return (
    <ContentPageRenderer slug="terms" fallbackContent={FALLBACK_CONTENT} />
  );
}
