'use client';

export default function AboutPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: legalStyles }} />
      <div className="legal-page">
        <h1>About Phoenix Sportsbook</h1>
        <p className="legal-updated">Last updated: April 2026</p>

        <section>
          <h2>Who We Are</h2>
          <p>
            Phoenix Sportsbook is a next-generation sports betting platform built for speed,
            transparency, and responsible play. We combine real-time odds from global markets
            with a modern interface designed around the bettor's experience.
          </p>
        </section>

        <section>
          <h2>Our Mission</h2>
          <p>
            We believe sports betting should be fair, fun, and fully in the player's control.
            Our platform provides competitive odds, instant payouts, and tools that help you
            bet responsibly — because entertainment should never come at a cost you can't afford.
          </p>
        </section>

        <section>
          <h2>What We Offer</h2>
          <p>
            Pre-match and live in-play betting across dozens of sports. Single bets and parlays
            with real-time odds movement. Cash-out options on open bets. Deposit and session
            limits you control. A full responsible gaming suite including cool-off periods
            and self-exclusion.
          </p>
        </section>

        <section>
          <h2>Licensing &amp; Regulation</h2>
          <p>
            Phoenix Sportsbook operates under applicable gaming licenses and regulatory
            frameworks. All wagering activity is subject to the terms of service and
            applicable laws of the jurisdiction in which you are located.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For support inquiries, reach us at{' '}
            <a href="mailto:support@phoenixsportsbook.com">support@phoenixsportsbook.com</a>.
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
    font-size: 14px; line-height: 1.7; color: #94a3b8;
  }
  .legal-page a {
    color: #f97316; text-decoration: none;
  }
  .legal-page a:hover { text-decoration: underline; }
  .legal-page ul {
    list-style: disc; padding-left: 20px; margin: 10px 0;
  }
  .legal-page li {
    font-size: 14px; line-height: 1.7; color: #94a3b8; margin-bottom: 4px;
  }
`;
