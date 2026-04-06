"use client";

import UpcomingMatches from "../components/UpcomingMatches";

export default function StartingSoonPage() {
  return (
    <div>
      <h1
        style={{
          fontSize: "28px",
          fontWeight: 700,
          marginBottom: "24px",
          color: "#ffffff",
        }}
      >
        Starting Soon
      </h1>
      <UpcomingMatches />
    </div>
  );
}
