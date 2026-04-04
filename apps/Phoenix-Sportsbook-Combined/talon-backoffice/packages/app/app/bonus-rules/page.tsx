"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "../lib/api/client";
import { logger } from "../lib/logger";

interface BonusContent {
  title?: string;
  content?: string;
  sections?: Array<{
    heading: string;
    body: string;
  }>;
}

export default function BonusRulesPage() {
  const [content, setContent] = useState<BonusContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get<BonusContent>(
          "/api/v1/content/bonus-rules",
        );
        setContent(data);
      } catch (err) {
        logger.error("BonusRules", "Failed to load bonus rules", err);
        setContent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  const pageContent = content || fallbackContent;

  if (loading) {
    return (
      <div
        style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 20px" }}
      >
        <div style={{ fontSize: "16px", color: "#64748b" }}>
          Loading bonus rules...
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: legalStyles }} />
      <div className="legal-page">
        <h1>{pageContent.title || "Bonus Rules"}</h1>
        <p className="legal-updated">Last updated: April 2026</p>

        {pageContent.sections ? (
          pageContent.sections.map((section, idx) => (
            <section key={idx}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))
        ) : (
          <section>
            <p>{pageContent.content || fallbackContent.content}</p>
          </section>
        )}
      </div>
    </>
  );
}

const fallbackContent: BonusContent = {
  title: "Bonus Rules",
  sections: [
    {
      heading: "1. Welcome Bonus Eligibility",
      body: "New accounts are eligible to receive a welcome bonus on their first deposit. To qualify, you must be at least 18 years old, have a verified account, and reside in a jurisdiction where the bonus is offered. Each account can only receive one welcome bonus.",
    },
    {
      heading: "2. Bonus Amount",
      body: "The welcome bonus matches your first deposit at 100%, up to a maximum of $500. For example, a $100 deposit will earn you a $100 bonus credit, for a total of $200 to play with.",
    },
    {
      heading: "3. Rollover Requirements",
      body: "The bonus and matched deposit amount must be wagered 5 times before you can withdraw the funds. Bets must be placed with a minimum odds of -200 (1.5 decimal odds) or higher. Parlays may count as multiple rollovers based on the number of legs.",
    },
    {
      heading: "4. Eligible Bet Types",
      body: "The bonus can be used on all pre-match and live betting markets. Prop bets, parlays, and special markets all count toward rollover requirements. Cash-out actions do not affect bonus wagering requirements.",
    },
    {
      heading: "5. Bonus Expiration",
      body: "Welcome bonuses expire 30 days after the account is created. Any unused bonus or unmet wagering requirements will be forfeited after the expiration date. You must meet the rollover requirement before withdrawal.",
    },
    {
      heading: "6. Withdrawal Restrictions",
      body: "While a bonus is active or rollover requirements are pending, you cannot withdraw your bonus or matched deposit amount. You may withdraw winnings generated from bonus funds once rollover requirements are met.",
    },
    {
      heading: "7. Multiple Promotions",
      body: "You can participate in only one promotional offer at a time. If you claim a new promotion, any active bonus terms are canceled and replaced with the new promotion terms.",
    },
    {
      heading: "8. Responsible Gaming",
      body: "Bonuses are intended to enhance your entertainment. You can set deposit limits, session limits, and self-exclude if you feel you are betting beyond your means. All bonus terms are subject to responsible gaming policies.",
    },
    {
      heading: "9. Terms Modification",
      body: "TAYA NA! Sportsbook reserves the right to modify bonus terms, eligibility, or promotional offers at any time. Bonuses in progress will not be affected by future changes.",
    },
    {
      heading: "10. Support",
      body: "For questions about bonus terms, eligibility, or rollover status, contact our support team at support@phoenixsportsbook.com or call 1-800-PHOENIX-1.",
    },
  ],
};

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
    color: #39ff14; text-decoration: none;
  }
  .legal-page a:hover { text-decoration: underline; }
`;
