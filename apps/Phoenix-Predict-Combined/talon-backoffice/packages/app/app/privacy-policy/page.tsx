"use client";

import { ContentPageRenderer } from "../components/ContentPage";

const FALLBACK_CONTENT = `
<h1>Privacy Policy</h1>
<p style="font-size: 12px; color: #4a5580; margin-bottom: 32px;">Effective: April 2026</p>

<h2>1. Information We Collect</h2>
<p>We collect information you provide when creating an account (name, email, date of birth, address), payment information for deposits and withdrawals, and usage data including betting history, device information, and IP address.</p>

<h2>2. How We Use Your Information</h2>
<p>Your data is used to operate your account, process transactions, comply with regulatory obligations (KYC/AML), provide customer support, improve our services, and communicate important account updates.</p>

<h2>3. Data Sharing</h2>
<p>We do not sell your personal information. We may share data with payment processors, identity verification providers, regulatory authorities as required by law, and service providers who assist in operating the platform.</p>

<h2>4. Data Security</h2>
<p>We use industry-standard encryption and security measures to protect your data. All financial transactions are encrypted in transit and at rest. Access to personal data is restricted to authorized personnel only.</p>

<h2>5. Cookies &amp; Tracking</h2>
<p>We use essential cookies for authentication and session management. Analytics cookies help us understand how the platform is used. You can manage cookie preferences in your browser settings.</p>

<h2>6. Your Rights</h2>
<p>Depending on your jurisdiction, you may have the right to access, correct, or delete your personal data, object to processing, and request data portability. To exercise these rights, contact our privacy team.</p>

<h2>7. Data Retention</h2>
<p>We retain account data for the duration of your account and for a period thereafter as required by regulatory obligations. Transaction records are retained for a minimum of 5 years.</p>

<h2>8. Contact</h2>
<p>Privacy inquiries can be sent to <a href="mailto:privacy@tayanasportsbook.com">privacy@tayanasportsbook.com</a>.</p>
`;

export default function PrivacyPolicyPage() {
  return (
    <ContentPageRenderer
      slug="privacy-policy"
      fallbackContent={FALLBACK_CONTENT}
    />
  );
}
