"use client";

export default function TermsPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: legalStyles }} />
      <div className="legal-page">
        <h1>Terms &amp; Conditions</h1>
        <p className="legal-updated">Effective: April 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using TAYA NA!, you agree to be bound by these
            Terms and Conditions. If you do not agree, you must not use the
            platform.
          </p>
        </section>

        <section>
          <h2>2. Eligibility</h2>
          <p>
            You must be at least the minimum legal age for gambling in your
            jurisdiction to use this service. You are responsible for ensuring
            that your use of the platform complies with all applicable local
            laws and regulations.
          </p>
        </section>

        <section>
          <h2>3. Account Registration</h2>
          <p>
            You may only maintain one account. All information provided must be
            accurate and kept up to date. You are responsible for maintaining
            the confidentiality of your login credentials and for all activity
            that occurs under your account.
          </p>
        </section>

        <section>
          <h2>4. Deposits &amp; Withdrawals</h2>
          <p>
            Deposits are processed using accepted payment methods. Withdrawals
            are subject to identity verification and may take up to 5 business
            days. We reserve the right to request documentation for compliance
            with anti-money laundering regulations.
          </p>
        </section>

        <section>
          <h2>5. Betting Rules</h2>
          <p>
            All bets are subject to the rules published on the Betting Rules
            page. Odds are subject to change until a bet is confirmed. Once
            placed and confirmed, a bet cannot be cancelled unless a cash-out
            option is available.
          </p>
        </section>

        <section>
          <h2>6. Responsible Gaming</h2>
          <p>
            We are committed to responsible gambling. Tools including deposit
            limits, session limits, cool-off periods, and self-exclusion are
            available in your account settings. If you believe you may have a
            gambling problem, please visit our Responsible Gaming page.
          </p>
        </section>

        <section>
          <h2>7. Limitation of Liability</h2>
          <p>
            TAYA NA! is provided "as is" without warranties of any kind. We
            are not liable for any losses incurred through the use of the
            platform, including but not limited to losses from technical
            failures, interrupted service, or incorrect odds display.
          </p>
        </section>

        <section>
          <h2>8. Modifications</h2>
          <p>
            We reserve the right to modify these Terms at any time. Continued
            use of the platform after changes constitutes acceptance of the
            revised Terms.
          </p>
        </section>

        <section>
          <h2>9. Contact</h2>
          <p>
            Questions about these Terms may be directed to{" "}
            <a href="mailto:legal@tayanasportsbook.com">
              legal@tayanasportsbook.com
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
    max-width: 720px; margin: 0 auto; padding: 32px 20px;
  }
  .legal-page h1 {
    font-size: 24px; font-weight: 800; color: #f8fafc; margin-bottom: 6px;
    letter-spacing: -0.02em;
  }
  .legal-updated {
    font-size: 12px; color: #4a5580; margin-bottom: 32px;
  }
  .legal-page section { margin-bottom: 28px; }
  .legal-page h2 {
    font-size: 16px; font-weight: 700; color: #f1f5f9; margin-bottom: 10px;
  }
  .legal-page p {
    font-size: 14px; line-height: 1.7; color: #D3D3D3;
  }
  .legal-page a {
    color: #39ff14; text-decoration: none;
  }
  .legal-page a:hover { text-decoration: underline; }
`;
