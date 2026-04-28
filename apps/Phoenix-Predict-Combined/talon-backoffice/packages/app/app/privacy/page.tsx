"use client";

export default function PrivacyPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: legalStyles }} />
      <div className="legal-page">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Effective: April 2026</p>

        <section>
          <h2>1. Information We Collect</h2>
          <p>
            We collect information you provide when creating an account (name,
            email, date of birth, address), payment information for deposits and
            withdrawals, and usage data including trading history, device
            information, and IP address.
          </p>
        </section>

        <section>
          <h2>2. How We Use Your Information</h2>
          <p>
            Your data is used to operate your account, process transactions,
            comply with regulatory obligations (KYC/AML), provide customer
            support, improve our services, and communicate important account
            updates.
          </p>
        </section>

        <section>
          <h2>3. Data Sharing</h2>
          <p>
            We do not sell your personal information. We may share data with
            payment processors, identity verification providers, regulatory
            authorities as required by law, and service providers who assist in
            operating the platform.
          </p>
        </section>

        <section>
          <h2>4. Data Security</h2>
          <p>
            We use industry-standard encryption and security measures to protect
            your data. All financial transactions are encrypted in transit and
            at rest. Access to personal data is restricted to authorized
            personnel only.
          </p>
        </section>

        <section>
          <h2>5. Cookies &amp; Tracking</h2>
          <p>
            We use essential cookies for authentication and session management.
            Analytics cookies help us understand how the platform is used. You
            can manage cookie preferences in your browser settings.
          </p>
        </section>

        <section>
          <h2>6. Your Rights</h2>
          <p>
            Depending on your jurisdiction, you may have the right to access,
            correct, or delete your personal data, object to processing, and
            request data portability. To exercise these rights, contact our
            privacy team.
          </p>
        </section>

        <section>
          <h2>7. Data Retention</h2>
          <p>
            We retain account data for the duration of your account and for a
            period thereafter as required by regulatory obligations. Transaction
            records are retained for a minimum of 5 years.
          </p>
        </section>

        <section>
          <h2>8. Contact</h2>
          <p>
            Privacy inquiries can be sent to{" "}
            <a href="mailto:privacy@tayanasportsbook.com">
              privacy@tayanasportsbook.com
            </a>
            .
          </p>
        </section>
      </div>
    </>
  );
}

const legalStyles = `
  .legal-page {
    position: relative;
    max-width: 720px;
    margin: 0 auto;
    padding: 36px 36px 32px;
    border-radius: var(--r-rh-lg);
    background: var(--surface-1);
    border: 1px solid var(--border-1);
  }
  .legal-page h1 {
    font-size: 26px;
    font-weight: 800;
    color: var(--t1);
    margin-bottom: 6px;
    letter-spacing: -0.02em;
  }
  .legal-updated {
    font-size: 12px;
    color: var(--t3);
    margin-bottom: 28px;
    font-family: 'IBM Plex Mono', monospace;
    letter-spacing: 0.04em;
  }
  .legal-page section { margin-bottom: 24px; }
  .legal-page h2 {
    font-size: 16px;
    font-weight: 700;
    color: var(--t1);
    margin-bottom: 10px;
    letter-spacing: -0.01em;
  }
  .legal-page p {
    font-size: 14px;
    line-height: 1.7;
    color: var(--t2);
  }
  .legal-page a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
  }
  .legal-page a:hover {
    text-decoration: underline;
    color: var(--accent);
    filter: brightness(1.1);
  }
`;
