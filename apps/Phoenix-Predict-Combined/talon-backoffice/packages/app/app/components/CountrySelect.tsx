"use client";

import React from "react";

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "NZ", name: "New Zealand" },
  { code: "IE", name: "Ireland" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "BE", name: "Belgium" },
  { code: "PT", name: "Portugal" },
  { code: "OTHER", name: "Other" },
];

export default function CountrySelect({
  value,
  onChange,
  label,
}: CountrySelectProps) {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: "600",
    color: "#cbd5e1",
  };

  const selectStyle: React.CSSProperties = {
    padding: "10px 12px",
    backgroundColor: "#0f1225",
    border: "1px solid #1a1f3a",
    borderRadius: "4px",
    color: "#e2e8f0",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  return (
    <div style={containerStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={selectStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#39ff14";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(57, 255, 20, 0.1)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#1a1f3a";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <option value="">Select a country</option>
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
    </div>
  );
}
