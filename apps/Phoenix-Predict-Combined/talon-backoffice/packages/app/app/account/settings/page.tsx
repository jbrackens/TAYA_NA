"use client";

/**
 * SettingsPage — language + timezone preferences (App Router).
 *
 * Replaces the legacy pages-router /account/settings (pages/account/settings)
 * which crashed with "could not find react-redux context value" because the
 * pages router has no _app.tsx providing a Redux Provider after the App
 * Router migration. This rewrite uses the existing app i18n config
 * (app/lib/i18n/config.ts) and stores the timezone preference in
 * localStorage under `phoenix_timezone` (mirroring the language key).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import i18n, { SUPPORTED_LANGUAGES } from "../../lib/i18n/config";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  de: "Deutsch",
};

// A small but reasonable set. Browser default goes at the top.
const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function SettingsPage() {
  const [language, setLanguage] = useState<string>("en");
  const [timezone, setTimezone] = useState<string>("UTC");
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  useEffect(() => {
    const storedLang = localStorage.getItem("phoenix_language");
    const storedTz = localStorage.getItem("phoenix_timezone");
    if (storedLang && SUPPORTED_LANGUAGES.includes(storedLang)) {
      setLanguage(storedLang);
    } else {
      setLanguage(i18n.language || "en");
    }
    setTimezone(storedTz || browserTimezone());
  }, []);

  function handleLanguageChange(next: string) {
    setLanguage(next);
    localStorage.setItem("phoenix_language", next);
    void i18n.changeLanguage(next);
    flash("Language updated");
  }

  function handleTimezoneChange(next: string) {
    setTimezone(next);
    localStorage.setItem("phoenix_timezone", next);
    flash("Timezone updated");
  }

  function flash(message: string) {
    setSavedFlash(message);
    window.setTimeout(() => setSavedFlash(null), 2000);
  }

  const browserTz = browserTimezone();
  const tzOptions = Array.from(new Set([browserTz, ...TIMEZONES]));
  const now = new Date();
  let zonedExample = "—";
  try {
    zonedExample = new Intl.DateTimeFormat(language, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(now);
  } catch {
    zonedExample = now.toLocaleString();
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: settingsStyles }} />
      <div className="set-page">
        <div className="set-header">
          <div>
            <h1>Settings</h1>
            <p>Language and timezone preferences for your account.</p>
          </div>
          <Link href="/account" className="set-back">
            ← Back
          </Link>
        </div>

        {savedFlash && <div className="set-flash">{savedFlash}</div>}

        <section className="set-card">
          <h2>Language</h2>
          <p className="set-desc">
            Translations apply across the app immediately, and persist for
            future sessions on this device.
          </p>
          <div className="set-row">
            <label className="set-label" htmlFor="set-lang">
              Display language
            </label>
            <select
              id="set-lang"
              className="set-select"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((lng) => (
                <option key={lng} value={lng}>
                  {LANGUAGE_LABELS[lng] ?? lng.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="set-card">
          <h2>Timezone</h2>
          <p className="set-desc">
            Used to display market close times and trade history in your local
            time. Defaults to your browser&rsquo;s timezone
            {browserTz ? ` (${browserTz})` : ""}.
          </p>
          <div className="set-row">
            <label className="set-label" htmlFor="set-tz">
              Display timezone
            </label>
            <select
              id="set-tz"
              className="set-select"
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
            >
              {tzOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz === browserTz ? `${tz} (browser)` : tz}
                </option>
              ))}
            </select>
          </div>
          <div className="set-preview">
            <span className="set-preview-label">Preview</span>
            <span className="set-preview-value mono">{zonedExample}</span>
          </div>
        </section>

        <p className="set-foot">
          Need security, password, or notification settings? Find them in{" "}
          <Link href="/account/security">Security</Link>,{" "}
          <Link href="/account/notifications">Alerts</Link>, and{" "}
          <Link href="/account">Account</Link>.
        </p>
      </div>
    </>
  );
}

const settingsStyles = `
  .set-page { max-width: 800px; margin: 0 auto; padding: 24px 16px; }

  .set-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 24px;
  }
  @media (max-width: 640px) {
    .set-header { flex-direction: column; gap: 16px; }
  }
  .set-header h1 {
    font-size: 28px; font-weight: 800; color: var(--t1); margin: 0 0 4px;
    letter-spacing: -0.02em;
  }
  .set-header p { font-size: 14px; color: var(--t3); margin: 0; }

  .set-back {
    padding: 10px 16px; background: rgba(0, 0, 0, 0.22); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px; color: var(--t1); text-decoration: none; font-size: 13px;
    font-weight: 600; transition: all 0.15s;
  }
  .set-back:hover { border-color: var(--accent); color: var(--accent); }

  .set-flash {
    padding: 10px 14px; margin-bottom: 16px;
    background: var(--accent-soft, rgba(43, 228, 128, 0.08));
    border: 1px solid rgba(43, 228, 128, 0.28);
    border-radius: 8px; color: var(--accent);
    font-size: 13px; font-weight: 600;
  }

  .set-card {
    background: var(--surface-1, rgba(0, 0, 0, 0.22));
    border: 1px solid var(--border-1, rgba(255, 255, 255, 0.08));
    border-radius: 12px; padding: 22px 24px;
    margin-bottom: 16px;
  }
  .set-card h2 {
    font-size: 16px; font-weight: 700; color: var(--t1); margin: 0 0 6px;
    letter-spacing: -0.01em;
  }
  .set-desc { font-size: 13px; color: var(--t3); margin: 0 0 16px; line-height: 1.5; }

  .set-row { display: flex; flex-direction: column; gap: 8px; }
  .set-label { font-size: 13px; font-weight: 600; color: var(--t2); }
  .set-select {
    padding: 10px 12px; background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;
    color: var(--t1); font-size: 14px; outline: none; cursor: pointer;
    transition: border-color 0.15s;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .set-select:focus { border-color: var(--accent); }

  .set-preview {
    display: flex; gap: 14px; align-items: baseline; margin-top: 14px;
    padding-top: 14px; border-top: 1px solid var(--border-1, rgba(255, 255, 255, 0.08));
  }
  .set-preview-label {
    font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--t3);
  }
  .set-preview-value { font-size: 14px; color: var(--t1); font-weight: 600; }
  .mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }

  .set-foot {
    margin-top: 8px; font-size: 13px; color: var(--t3); line-height: 1.6;
  }
  .set-foot a { color: var(--accent); text-decoration: none; }
  .set-foot a:hover { text-decoration: underline; }
`;
