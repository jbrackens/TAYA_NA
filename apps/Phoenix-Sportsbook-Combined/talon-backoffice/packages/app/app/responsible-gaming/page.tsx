"use client";

import React, { useState } from "react";

type LimitType = "deposit" | "stake" | "session";
type LimitPeriod = "daily" | "weekly" | "monthly";

interface LimitFormState {
  type: LimitType;
  period: LimitPeriod;
  amount: string;
}

export default function ResponsibleGamingPage() {
  const [activeSection, setActiveSection] = useState<string>("limits");
  const [limitForm, setLimitForm] = useState<LimitFormState>({
    type: "deposit",
    period: "daily",
    amount: "",
  });
  const [coolOffDays, setCoolOffDays] = useState("7");
  const [selfExcludeConfirm, setSelfExcludeConfirm] = useState(false);

  const sections = [
    { id: "limits", label: "Set Limits" },
    { id: "cooloff", label: "Cool Off" },
    { id: "selfexclude", label: "Self-Exclusion" },
    { id: "info", label: "Information" },
  ];

  const cardStyle: React.CSSProperties = {
    background: "#111633",
    borderRadius: 12,
    padding: 24,
    border: "1px solid #1a1f3a",
    marginBottom: 16,
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase" as const,
    marginBottom: 8,
    display: "block",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #1a1f3a",
    background: "#0b0e1c",
    color: "#e2e8f0",
    fontSize: 14,
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none" as const,
  };
  const btnStyle: React.CSSProperties = {
    padding: "12px 24px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg, #39ff14, #2ed600)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  };
  const btnDangerStyle: React.CSSProperties = {
    ...btnStyle,
    background: "#ef4444",
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#f8fafc",
          marginBottom: 8,
        }}
      >
        Responsible Gaming
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "#64748b",
          marginBottom: 24,
          lineHeight: 1.6,
        }}
      >
        We are committed to responsible gaming. Use the tools below to manage
        your gambling activity and set personal limits.
      </p>

      {/* Section Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              flex: 1,
              padding: "10px 8px",
              borderRadius: 8,
              border: "none",
              background: activeSection === s.id ? "#1a2040" : "transparent",
              color: activeSection === s.id ? "#39ff14" : "#64748b",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Set Limits */}
      {activeSection === "limits" && (
        <div style={cardStyle}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#f8fafc",
              marginBottom: 16,
            }}
          >
            Set Deposit, Stake & Session Limits
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Limit Type</label>
              <select
                style={selectStyle}
                value={limitForm.type}
                onChange={(e) =>
                  setLimitForm({
                    ...limitForm,
                    type: e.target.value as LimitType,
                  })
                }
              >
                <option value="deposit">Deposit Limit</option>
                <option value="stake">Stake Limit</option>
                <option value="session">Session Limit (minutes)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Period</label>
              <select
                style={selectStyle}
                value={limitForm.period}
                onChange={(e) =>
                  setLimitForm({
                    ...limitForm,
                    period: e.target.value as LimitPeriod,
                  })
                }
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>
                {limitForm.type === "session" ? "Minutes" : "Amount ($)"}
              </label>
              <input
                type="number"
                style={inputStyle}
                value={limitForm.amount}
                onChange={(e) =>
                  setLimitForm({ ...limitForm, amount: e.target.value })
                }
                placeholder={
                  limitForm.type === "session" ? "e.g. 120" : "e.g. 500"
                }
                min="0"
              />
            </div>
            <button style={btnStyle}>Set Limit</button>
          </div>
        </div>
      )}

      {/* Cool Off */}
      {activeSection === "cooloff" && (
        <div style={cardStyle}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#f8fafc",
              marginBottom: 8,
            }}
          >
            Cool Off Period
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              marginBottom: 16,
              lineHeight: 1.6,
            }}
          >
            Take a break from gambling. During the cool off period, you will not
            be able to place any bets. This cannot be reversed early.
          </p>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Duration</label>
            <select
              style={selectStyle}
              value={coolOffDays}
              onChange={(e) => setCoolOffDays(e.target.value)}
            >
              <option value="1">1 Day</option>
              <option value="3">3 Days</option>
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>
          </div>
          <button style={{ ...btnStyle, background: "#eab308" }}>
            Start Cool Off ({coolOffDays} days)
          </button>
        </div>
      )}

      {/* Self-Exclusion */}
      {activeSection === "selfexclude" && (
        <div style={{ ...cardStyle, borderColor: "#ef444440" }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#ef4444",
              marginBottom: 8,
            }}
          >
            Self-Exclusion
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              marginBottom: 16,
              lineHeight: 1.6,
            }}
          >
            Self-exclusion permanently closes your account and prevents you from
            creating new accounts. This action cannot be undone.
          </p>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginBottom: 16,
              fontSize: 13,
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={selfExcludeConfirm}
              onChange={(e) => setSelfExcludeConfirm(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              I understand that self-exclusion is permanent and I will lose
              access to my account, including any remaining balance.
            </span>
          </label>
          <button
            style={{ ...btnDangerStyle, opacity: selfExcludeConfirm ? 1 : 0.5 }}
            disabled={!selfExcludeConfirm}
          >
            Self-Exclude My Account
          </button>
        </div>
      )}

      {/* Information */}
      {activeSection === "info" && (
        <>
          {/* Warning Signs */}
          <div style={cardStyle}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#f8fafc",
                marginBottom: 16,
              }}
            >
              Problem Gambling Warning Signs
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "#64748b",
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              If you recognize any of the following behaviors in yourself, it
              may be time to seek help:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Spending more money or time on gambling than you can afford",
                "Difficulty controlling or stopping gambling once you start",
                "Feeling restless or irritable when trying to stop gambling",
                "Gambling to escape problems or relieve feelings of anxiety or depression",
                "Chasing losses by betting more to recover money already lost",
                "Lying to family members or others about how much you gamble",
                "Borrowing money or selling possessions to fund gambling",
                "Neglecting work, school, or family responsibilities due to gambling",
                "Risking or losing important relationships because of gambling",
                "Feeling guilty or ashamed about your gambling behavior",
              ].map((sign) => (
                <label
                  key={sign}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    fontSize: 13,
                    color: "#94a3b8",
                    padding: "8px 12px",
                    background: "#0b0e1c",
                    borderRadius: 6,
                    border: "1px solid #1a1f3a",
                  }}
                >
                  <input
                    type="checkbox"
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <span>{sign}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Hotlines & Resources */}
          <div style={cardStyle}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#f8fafc",
                marginBottom: 16,
              }}
            >
              Helplines &amp; Resources
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                {
                  name: "1-800-GAMBLER",
                  url: "https://www.1800gambler.net",
                  phone: "1-800-426-2537",
                  desc: "24/7 confidential helpline for problem gamblers",
                },
                {
                  name: "National Council on Problem Gambling (NCPG)",
                  url: "https://www.ncpgambling.org",
                  phone: "1-800-522-4700",
                  desc: "National helpline and online chat support",
                },
                {
                  name: "Gamblers Anonymous",
                  url: "https://www.gamblersanonymous.org",
                  phone: "",
                  desc: "Peer support and 12-step recovery program for compulsive gamblers",
                },
                {
                  name: "GamStop (UK Self-Exclusion)",
                  url: "https://www.gamstop.co.uk",
                  phone: "",
                  desc: "Free self-exclusion service for UK-licensed online gambling",
                },
              ].map((resource) => (
                <div
                  key={resource.name}
                  style={{
                    padding: 16,
                    borderRadius: 8,
                    background: "#0b0e1c",
                    border: "1px solid #1a1f3a",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#e2e8f0",
                      marginBottom: 4,
                    }}
                  >
                    {resource.name}
                  </div>
                  {resource.desc && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#94a3b8",
                        marginBottom: 6,
                      }}
                    >
                      {resource.desc}
                    </div>
                  )}
                  {resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12,
                        color: "#39ff14",
                        textDecoration: "none",
                      }}
                    >
                      {resource.url}
                    </a>
                  )}
                  {resource.phone && (
                    <div
                      style={{ fontSize: 12, color: "#22c55e", marginTop: 2 }}
                    >
                      {resource.phone}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Patron Protection */}
          <div style={cardStyle}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#f8fafc",
                marginBottom: 16,
              }}
            >
              Patron Protection
            </h2>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
              <p style={{ marginBottom: 12 }}>
                TAYA NA! Sportsbook is committed to protecting our patrons. We
                implement the following measures:
              </p>
              <ul
                style={{
                  paddingLeft: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <li>
                  Age verification to prevent underage gambling (18+ / 21+
                  depending on jurisdiction)
                </li>
                <li>
                  Deposit, stake, and session limits that you can set and adjust
                  at any time
                </li>
                <li>Cool-off periods and permanent self-exclusion options</li>
                <li>
                  Transaction monitoring to detect unusual or harmful patterns
                </li>
                <li>
                  Mandatory responsible gaming messaging in all promotional
                  materials
                </li>
                <li>
                  Staff training on responsible gaming and problem gambling
                  indicators
                </li>
              </ul>
            </div>
          </div>

          {/* Dispute Resolution */}
          <div style={cardStyle}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#f8fafc",
                marginBottom: 16,
              }}
            >
              Dispute Resolution
            </h2>
            <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
              <p style={{ marginBottom: 12 }}>
                If you have a complaint or dispute regarding your account,
                transactions, or betting outcomes, please follow these steps:
              </p>
              <ol
                style={{
                  paddingLeft: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <li>
                  <strong style={{ color: "#e2e8f0" }}>Contact Support:</strong>{" "}
                  Reach out to our customer support team via live chat or email
                  at{" "}
                  <a
                    href="mailto:support@phoenixsportsbook.com"
                    style={{ color: "#39ff14", textDecoration: "none" }}
                  >
                    support@phoenixsportsbook.com
                  </a>
                  . We aim to resolve most issues within 48 hours.
                </li>
                <li>
                  <strong style={{ color: "#e2e8f0" }}>
                    Formal Complaint:
                  </strong>{" "}
                  If you are not satisfied with the initial response, submit a
                  formal written complaint. We will acknowledge it within 24
                  hours and provide a final response within 8 weeks.
                </li>
                <li>
                  <strong style={{ color: "#e2e8f0" }}>
                    Independent Mediation:
                  </strong>{" "}
                  If the complaint remains unresolved, you may refer the matter
                  to an independent dispute resolution body as specified by your
                  local gaming authority.
                </li>
                <li>
                  <strong style={{ color: "#e2e8f0" }}>
                    Regulatory Authority:
                  </strong>{" "}
                  You may also contact the relevant gaming regulatory authority
                  in your jurisdiction to file a formal complaint.
                </li>
              </ol>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
