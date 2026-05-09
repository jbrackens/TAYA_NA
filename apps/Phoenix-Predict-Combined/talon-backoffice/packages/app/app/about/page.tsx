"use client";

import { ContentPageRenderer } from "../components/ContentPage";

const FALLBACK_CONTENT = `
<h1>About Hula Na!</h1>
<p style="font-size: 12px; color: #4a5580; margin-bottom: 32px;">Last updated: April 2026</p>

<h2>Who We Are</h2>
<p>Hula Na! is a prediction market platform where traders take positions on real-world outcomes — politics, crypto, sports, entertainment, tech, and economics. Markets price probability as cents (0–99) and pay out 100¢ per contract on the winning side.</p>

<h2>Our Mission</h2>
<p>We believe prediction markets are the most honest signal we have for what the world thinks will happen. Our platform exists to surface that signal with fair pricing, transparent settlement, and tools that keep the experience under your control.</p>

<h2>What We Offer</h2>
<p>Binary YES/NO contracts on real-world events across politics, crypto, sports, entertainment, tech, and economics. Continuous AMM-priced markets with live order books. Real-time portfolio tracking with positions, accuracy, and P&amp;L. Deposit and session limits you control. A full responsible-play suite including cool-off periods and self-exclusion.</p>

<h2>Licensing &amp; Regulation</h2>
<p>Hula Na! operates under applicable regulatory frameworks for event-contract trading. All trading activity is subject to the terms of service and applicable laws of the jurisdiction in which you are located.</p>

<h2>Contact</h2>
<p>For support inquiries, reach us at <a href="mailto:support@hulana.com">support@hulana.com</a>.</p>
`;

export default function AboutPage() {
  return (
    <ContentPageRenderer slug="about-us" fallbackContent={FALLBACK_CONTENT} />
  );
}
