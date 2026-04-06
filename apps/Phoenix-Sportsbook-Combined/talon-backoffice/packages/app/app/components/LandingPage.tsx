"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { getSports, Sport } from "../lib/api/events-client";
import { Zap, Gamepad2, ShieldCheck, Wallet, ShieldAlert } from "lucide-react";

/**
 * Pre-login marketing landing page.
 * Shows hero, feature sections, live sport counts, and CTA buttons.
 * Replaces the old Pages Router LandingPage component.
 */

interface FeatureSection {
  icon: React.ReactNode;
  heading: string;
  subHeading: string;
  description: string;
}

// Fallback data — Philippine market top sports (when API is unavailable)
const FALLBACK_SPORTS: Sport[] = [
  {
    sportId: "1",
    sportKey: "basketball",
    sportName: "Basketball",
    eventCount: 149,
  },
  { sportId: "2", sportKey: "boxing", sportName: "Boxing", eventCount: 83 },
  { sportId: "3", sportKey: "soccer", sportName: "Football", eventCount: 1108 },
  {
    sportId: "4",
    sportKey: "volleyball",
    sportName: "Volleyball",
    eventCount: 26,
  },
  { sportId: "5", sportKey: "tennis", sportName: "Tennis", eventCount: 42 },
  { sportId: "6", sportKey: "mma", sportName: "MMA", eventCount: 63 },
  { sportId: "7", sportKey: "baseball", sportName: "Baseball", eventCount: 68 },
  {
    sportId: "8",
    sportKey: "badminton",
    sportName: "Badminton",
    eventCount: 23,
  },
];

const FEATURES: FeatureSection[] = [
  {
    icon: <Zap size={24} strokeWidth={2} />,
    heading: "FEATURE_1_HEADING",
    subHeading: "FEATURE_1_SUBHEADING",
    description: "FEATURE_1_DESCRIPTION",
  },
  {
    icon: <Gamepad2 size={24} strokeWidth={2} />,
    heading: "FEATURE_2_HEADING",
    subHeading: "FEATURE_2_SUBHEADING",
    description: "FEATURE_2_DESCRIPTION",
  },
  {
    icon: <ShieldCheck size={24} strokeWidth={2} />,
    heading: "FEATURE_3_HEADING",
    subHeading: "FEATURE_3_SUBHEADING",
    description: "FEATURE_3_DESCRIPTION",
  },
  {
    icon: <Wallet size={24} strokeWidth={2} />,
    heading: "FEATURE_4_HEADING",
    subHeading: "FEATURE_4_SUBHEADING",
    description: "FEATURE_4_DESCRIPTION",
  },
];

export default function LandingPage() {
  const { t } = useTranslation("landing");
  const [sports, setSports] = useState<Sport[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);

  useEffect(() => {
    getSports()
      .then((data) => {
        if (data.length > 0) {
          setSports(data.slice(0, 8));
          setTotalEvents(data.reduce((sum, s) => sum + (s.eventCount || 0), 0));
        } else {
          setSports(FALLBACK_SPORTS);
          setTotalEvents(
            FALLBACK_SPORTS.reduce((sum, s) => sum + (s.eventCount || 0), 0),
          );
        }
      })
      .catch(() => {
        setSports(FALLBACK_SPORTS);
        setTotalEvents(
          FALLBACK_SPORTS.reduce((sum, s) => sum + (s.eventCount || 0), 0),
        );
      });
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: landingStyles }} />

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-glow" />
        <div className="landing-hero-content">
          <p className="landing-eyebrow">{t("HERO_EYEBROW")}</p>
          <h1 className="landing-h1">
            {t("HERO_TITLE_START")} <span className="accent">TAYA NA!</span>
          </h1>
          <p className="landing-subtitle">{t("HERO_SUBTITLE")}</p>
          <div className="landing-cta-row">
            <Link href="/auth/register" className="landing-btn-primary">
              {t("CTA_CREATE_ACCOUNT")}
            </Link>
            <Link href="/auth/login" className="landing-btn-secondary">
              {t("CTA_LOGIN")}
            </Link>
          </div>

          {/* Live stats */}
          <div className="landing-stats">
            <div className="landing-stat">
              <span className="landing-stat-value">{sports.length || "—"}</span>
              <span className="landing-stat-label">{t("STATS_SPORTS")}</span>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <span className="landing-stat-value">{totalEvents || "—"}</span>
              <span className="landing-stat-label">{t("STATS_EVENTS")}</span>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <span className="landing-stat-value">3</span>
              <span className="landing-stat-label">
                {t("STATS_ODDS_FORMATS")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sport Chips ── */}
      {sports.length > 0 && (
        <section className="landing-section">
          <h2 className="landing-section-title">
            {t("SECTION_POPULAR_SPORTS")}
          </h2>
          <div className="landing-sport-chips">
            {sports.map((sport) => (
              <Link
                key={sport.sportKey}
                href={`/sports/${sport.sportKey}`}
                className="landing-sport-chip"
              >
                <span className="landing-sport-chip-name">
                  {sport.sportName}
                </span>
                <span className="landing-sport-chip-count">
                  {sport.eventCount}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Features Grid ── */}
      <section className="landing-section">
        <h2 className="landing-section-title">{t("SECTION_WHY_PHOENIX")}</h2>
        <div className="landing-features">
          {FEATURES.map((f) => (
            <div key={f.heading} className="landing-feature-card">
              <span className="landing-feature-icon">{f.icon}</span>
              <p className="landing-feature-sub">{t(f.subHeading)}</p>
              <h3 className="landing-feature-heading">{t(f.heading)}</h3>
              <p className="landing-feature-desc">{t(f.description)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Responsible Gaming Banner ── */}
      <section className="landing-rg-banner">
        <span className="landing-rg-icon">
          <ShieldAlert size={24} strokeWidth={2} />
        </span>
        <div>
          <h3 className="landing-rg-title">{t("RG_TITLE")}</h3>
          <p className="landing-rg-text">
            {t("RG_TEXT")}{" "}
            <Link href="/responsible-gaming" className="landing-rg-link">
              {t("RG_LEARN_MORE")}
            </Link>
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-final-cta">
        <h2>{t("FINAL_CTA_TITLE")}</h2>
        <p>{t("FINAL_CTA_SUBTITLE")}</p>
        <Link
          href="/auth/register"
          className="landing-btn-primary landing-btn-lg"
        >
          {t("FINAL_CTA_BUTTON")}
        </Link>
      </section>
    </>
  );
}

const landingStyles = `
  /* ── Hero ── */
  .landing-hero {
    position: relative; overflow: hidden;
    background: linear-gradient(135deg, #1a0a30 0%, #0f1225 40%, #0a1628 100%);
    border-radius: 20px; padding: 56px 40px; margin-bottom: 40px;
    border: 1px solid #1e2243;
  }
  .landing-hero-glow {
    position: absolute; top: -80px; right: -60px;
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(57,255,20,0.12) 0%, transparent 65%);
    pointer-events: none;
  }
  .landing-hero-content { position: relative; max-width: 640px; }
  .landing-eyebrow {
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em;
    color: #39ff14; margin-bottom: 12px;
  }
  .landing-h1 {
    font-size: 40px; font-weight: 900; color: #f8fafc; line-height: 1.15;
    margin-bottom: 16px; letter-spacing: -0.03em;
  }
  .landing-h1 .accent { color: #39ff14; }
  .landing-subtitle {
    font-size: 16px; color: #D3D3D3; line-height: 1.7; margin-bottom: 28px; max-width: 520px;
  }
  .landing-cta-row { display: flex; gap: 12px; margin-bottom: 36px; flex-wrap: wrap; }

  .landing-btn-primary {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 13px 28px; border-radius: 10px; border: none;
    background: linear-gradient(135deg, #39ff14, #2ed600); color: #101114;
    font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.15s;
    box-shadow: 0 4px 20px rgba(57,255,20,0.3); text-decoration: none;
  }
  .landing-btn-primary:hover { opacity: 0.92; transform: translateY(-1px); }
  .landing-btn-lg { padding: 16px 36px; font-size: 16px; }

  .landing-btn-secondary {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 13px 28px; border-radius: 10px;
    border: 1.5px solid #39ff14; background: transparent;
    color: #39ff14; font-size: 15px; font-weight: 700;
    cursor: pointer; transition: all 0.15s; text-decoration: none;
  }
  .landing-btn-secondary:hover { background: rgba(57,255,20,0.08); }

  /* Stats row */
  .landing-stats {
    display: flex; align-items: center; gap: 24px;
    padding: 20px 24px; background: rgba(15,18,37,0.7);
    border-radius: 12px; border: 1px solid #1a1f3a;
  }
  .landing-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .landing-stat-value { font-size: 24px; font-weight: 800; color: #39ff14; }
  .landing-stat-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .landing-stat-divider { width: 1px; height: 36px; background: #1a1f3a; }

  /* ── Sections ── */
  .landing-section { margin-bottom: 40px; }
  .landing-section-title {
    font-size: 20px; font-weight: 800; color: #f8fafc; margin-bottom: 20px; letter-spacing: -0.01em;
  }

  /* Sport chips */
  .landing-sport-chips { display: flex; gap: 10px; flex-wrap: wrap; }
  .landing-sport-chip {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 18px; border-radius: 10px;
    background: #111631; border: 1px solid #1a1f3a;
    color: #e2e8f0; font-size: 13px; font-weight: 600;
    text-decoration: none; transition: all 0.15s;
  }
  .landing-sport-chip:hover { border-color: #39ff14; color: #39ff14; }
  .landing-sport-chip-count {
    background: #1e2749; padding: 2px 8px; border-radius: 6px;
    font-size: 11px; font-weight: 700; color: #64748b;
  }

  /* Features grid */
  .landing-features { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
  .landing-feature-card {
    padding: 24px; border-radius: 14px;
    background: #0f1225; border: 1px solid #1a1f3a;
    transition: border-color 0.15s;
  }
  .landing-feature-card:hover { border-color: #2a3158; }
  .landing-feature-icon { font-size: 28px; display: block; margin-bottom: 12px; }
  .landing-feature-sub {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
    color: #39ff14; margin-bottom: 6px;
  }
  .landing-feature-heading { font-size: 16px; font-weight: 700; color: #f8fafc; margin-bottom: 8px; }
  .landing-feature-desc { font-size: 13px; color: #D3D3D3; line-height: 1.65; }

  /* RG Banner */
  .landing-rg-banner {
    display: flex; align-items: flex-start; gap: 16px;
    padding: 24px; border-radius: 14px; margin-bottom: 40px;
    background: rgba(34,197,94,0.04); border: 1px solid rgba(34,197,94,0.15);
  }
  .landing-rg-icon { font-size: 28px; flex-shrink: 0; }
  .landing-rg-title { font-size: 15px; font-weight: 700; color: #86efac; margin-bottom: 4px; }
  .landing-rg-text { font-size: 13px; color: #D3D3D3; line-height: 1.6; }
  .landing-rg-link { color: #22c55e; font-weight: 600; text-decoration: none; }
  .landing-rg-link:hover { text-decoration: underline; }

  /* Final CTA */
  .landing-final-cta {
    text-align: center; padding: 48px 24px; margin-bottom: 24px;
    border-radius: 20px;
    background: linear-gradient(135deg, #1a0a30 0%, #0f1225 50%, #0a1628 100%);
    border: 1px solid #1e2243;
  }
  .landing-final-cta h2 { font-size: 24px; font-weight: 800; color: #f8fafc; margin-bottom: 8px; }
  .landing-final-cta p { font-size: 15px; color: #64748b; margin-bottom: 24px; }

  @media (max-width: 768px) {
    .landing-hero { padding: 36px 24px; }
    .landing-h1 { font-size: 28px; }
    .landing-stats { flex-direction: column; gap: 16px; }
    .landing-stat-divider { width: 60px; height: 1px; }
    .landing-features { grid-template-columns: 1fr; }
  }
`;
