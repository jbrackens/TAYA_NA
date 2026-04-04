"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation("footer");
  const footerStyle: React.CSSProperties = {
    marginTop: "60px",
    padding: "40px 20px",
    backgroundColor: "#0f1225",
    borderTop: "1px solid #1a1f3a",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "32px",
    marginBottom: "32px",
  };

  const columnStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  };

  const columnTitleStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "8px",
  };

  const linkStyle: React.CSSProperties = {
    fontSize: "14px",
    color: "#cbd5e1",
    textDecoration: "none",
    transition: "color 0.2s",
  };

  const copyrightStyle: React.CSSProperties = {
    textAlign: "center",
    paddingTop: "20px",
    borderTop: "1px solid #1a1f3a",
    fontSize: "13px",
    color: "#64748b",
  };

  return (
    <footer style={footerStyle}>
      <div style={containerStyle}>
        <div style={columnStyle}>
          <div style={columnTitleStyle}>{t("COMPANY")}</div>
          <Link
            href="/about"
            style={linkStyle}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "#39ff14";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "#cbd5e1";
            }}
          >
            About Phoenix
          </Link>
        </div>

        <div style={columnStyle}>
          <div style={columnTitleStyle}>{t("TERMS_AND_CONDITIONS")}</div>
          <Link
            href="/terms"
            style={linkStyle}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "#39ff14";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "#cbd5e1";
            }}
          >
            {t("TERMS_AND_CONDITIONS")}
          </Link>
          <Link
            href="/privacy"
            style={linkStyle}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "#39ff14";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "#cbd5e1";
            }}
          >
            {t("PRIVACY_POLICY")}
          </Link>
          <Link
            href="/betting-rules"
            style={linkStyle}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "#39ff14";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "#cbd5e1";
            }}
          >
            {t("BETTING_RULES")}
          </Link>
          <Link
            href="/bonus-rules"
            style={linkStyle}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "#39ff14";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "#cbd5e1";
            }}
          >
            {t("BONUS_RULES")}
          </Link>
        </div>

        <div style={columnStyle}>
          <div style={columnTitleStyle}>{t("RESPONSIBLE_GAMING")}</div>
          <Link
            href="/responsible-gaming"
            style={linkStyle}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "#39ff14";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "#cbd5e1";
            }}
          >
            {t("RESPONSIBLE_GAMING")}
          </Link>
        </div>

        <div style={columnStyle}>
          <div style={columnTitleStyle}>{t("HELP")}</div>
          <Link
            href="/contact-us"
            style={linkStyle}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "#39ff14";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = "#cbd5e1";
            }}
          >
            {t("CONTACT_US")}
          </Link>
        </div>
      </div>

      <div style={copyrightStyle}>
        {t("LOWER_FOOTER_CONTENT", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
