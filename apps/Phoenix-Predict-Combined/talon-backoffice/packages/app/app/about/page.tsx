"use client";

import { ContentPageRenderer } from "../components/ContentPage";

const FALLBACK_CONTENT = `
<h1>About TAYA NA!</h1>
<p style="font-size: 12px; color: #4a5580; margin-bottom: 32px;">Last updated: April 2026</p>

<h2>Who We Are</h2>
<p>TAYA NA! is a next-generation betting platform built for speed, transparency, and responsible play. We combine real-time odds from global markets with a modern interface designed around the bettor's experience.</p>

<h2>Our Mission</h2>
<p>We believe sports betting should be fair, fun, and fully in the player's control. Our platform provides competitive odds, instant payouts, and tools that help you bet responsibly — because entertainment should never come at a cost you can't afford.</p>

<h2>What We Offer</h2>
<p>Pre-match and live in-play betting across dozens of sports. Single bets and parlays with real-time odds movement. Cash-out options on open bets. Deposit and session limits you control. A full responsible gaming suite including cool-off periods and self-exclusion.</p>

<h2>Licensing &amp; Regulation</h2>
<p>TAYA NA! operates under applicable gaming licenses and regulatory frameworks. All wagering activity is subject to the terms of service and applicable laws of the jurisdiction in which you are located.</p>

<h2>Contact</h2>
<p>For support inquiries, reach us at <a href="mailto:support@tayanasportsbook.com">support@tayanasportsbook.com</a>.</p>
`;

export default function AboutPage() {
  return (
    <ContentPageRenderer slug="about-us" fallbackContent={FALLBACK_CONTENT} />
  );
}
