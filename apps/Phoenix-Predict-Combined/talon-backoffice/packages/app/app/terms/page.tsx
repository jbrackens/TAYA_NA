"use client";

import { ContentPageRenderer } from "../components/ContentPage";

const FALLBACK_CONTENT = `
<h1>Terms &amp; Conditions</h1>
<p style="font-size: 12px; color: #4a5580; margin-bottom: 32px;">Effective: April 2026</p>

<h2>1. Acceptance of Terms</h2>
<p>By accessing or using Hula Na!, you agree to be bound by these Terms and Conditions. If you do not agree, you must not use the platform.</p>

<h2>2. Eligibility</h2>
<p>You must be at least the minimum legal age for participation in event-contract markets in your jurisdiction. You are responsible for ensuring that your use of the platform complies with all applicable local laws and regulations.</p>

<h2>3. Account Registration</h2>
<p>You may only maintain one account. All information provided must be accurate and kept up to date. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.</p>

<h2>4. Deposits &amp; Withdrawals</h2>
<p>Deposits are processed using accepted payment methods. Withdrawals are subject to identity verification and may take up to 5 business days. We reserve the right to request documentation for compliance with anti-money laundering regulations.</p>

<h2>5. Market Rules</h2>
<p>All trades are subject to the rules published on the Market Rules page. Quoted prices are continuous and update with order flow until a trade is confirmed. Settlement follows the resolution criteria stated for each market and pays 100¢ per contract on the winning side.</p>

<h2>6. Responsible Play</h2>
<p>We are committed to responsible participation. Tools including deposit limits, session limits, cool-off periods, and self-exclusion are available in your account settings. If you believe your participation may be causing harm, please visit our Responsible Play page.</p>

<h2>7. Limitation of Liability</h2>
<p>Hula Na! is provided "as is" without warranties of any kind. We are not liable for any losses incurred through the use of the platform, including but not limited to losses from technical failures, interrupted service, or incorrect price display.</p>

<h2>8. Modifications</h2>
<p>We reserve the right to modify these Terms at any time. Continued use of the platform after changes constitutes acceptance of the revised Terms.</p>

<h2>9. Contact</h2>
<p>Questions about these Terms may be directed to <a href="mailto:legal@hulana.com">legal@hulana.com</a>.</p>
`;

export default function TermsPage() {
  return (
    <ContentPageRenderer slug="terms" fallbackContent={FALLBACK_CONTENT} />
  );
}
