"use client";

import { useState, useCallback } from "react";
import type { BetAnalyticsHeatmapCell } from "../lib/api/betting-client";
import { colors, font, spacing, radius } from "../lib/theme";

interface BettingHeatmapProps {
  heatmap: BetAnalyticsHeatmapCell[];
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const HOUR_LABELS = ["12AM-6AM", "6AM-12PM", "12PM-6PM", "6PM-12AM"];

interface TooltipData {
  day: number;
  bucket: number;
  betCount: number;
  wonCount: number;
  x: number;
  y: number;
}

export default function BettingHeatmap({ heatmap }: BettingHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const cellMap = new Map<string, BetAnalyticsHeatmapCell>();
  let maxBetCount = 0;
  for (const cell of heatmap) {
    cellMap.set(`${cell.dayOfWeek}-${cell.hourBucket}`, cell);
    if (cell.betCount > maxBetCount) {
      maxBetCount = cell.betCount;
    }
  }

  const getCellColor = useCallback(
    (day: number, bucket: number): string => {
      const cell = cellMap.get(`${day}-${bucket}`);
      if (!cell || cell.betCount === 0) {
        return "rgba(255,255,255,0.04)";
      }
      const normalizedCount = maxBetCount > 0 ? cell.betCount / maxBetCount : 0;
      const winRate = cell.betCount > 0 ? cell.wonCount / cell.betCount : 0;
      const intensity = normalizedCount * 0.3 + winRate * 0.7;
      const opacity = 0.1 + intensity * 0.9;
      return `rgba(43, 228, 128,${opacity.toFixed(2)})`;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [heatmap],
  );

  const handleMouseEnter = useCallback(
    (day: number, bucket: number, event: React.MouseEvent<HTMLDivElement>) => {
      const cell = cellMap.get(`${day}-${bucket}`);
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltip({
        day,
        bucket,
        betCount: cell?.betCount ?? 0,
        wonCount: cell?.wonCount ?? 0,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [heatmap],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  if (heatmap.length === 0) {
    return null;
  }

  const winPct =
    tooltip && tooltip.betCount > 0
      ? Math.round((tooltip.wonCount / tooltip.betCount) * 100)
      : 0;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: radius["2xl"],
        padding: spacing.lg,
        marginTop: spacing.lg,
        position: "relative",
      }}
    >
      <div
        style={{
          color: colors.primary,
          fontSize: font.xs,
          fontWeight: font.bold,
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
          marginBottom: spacing.xs,
        }}
      >
        Betting Patterns
      </div>
      <div
        style={{
          color: colors.textSecondary,
          fontSize: font.md,
          marginBottom: spacing.lg,
        }}
      >
        Your win/loss activity by day and time
      </div>

      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto repeat(7, 36px)",
          gap: spacing.xs,
          justifyContent: "start",
        }}
      >
        <div />
        {DAY_LABELS.map((label, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
              color: colors.textMuted,
              fontSize: font.xs,
              fontWeight: font.semibold,
            }}
          >
            {label}
          </div>
        ))}

        {/* Grid rows */}
        {HOUR_LABELS.map((label, bucket) => (
          <div key={bucket} style={{ display: "contents" }}>
            <div
              style={{
                color: colors.textMuted,
                fontSize: font.xxs,
                fontWeight: font.medium,
                display: "flex",
                alignItems: "center",
                paddingRight: spacing.sm,
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </div>
            {Array.from({ length: 7 }, (_, day) => (
              <div
                key={day}
                onMouseEnter={(e) => handleMouseEnter(day, bucket, e)}
                onMouseLeave={handleMouseLeave}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.md,
                  background: getCellColor(day, bucket),
                  cursor: "pointer",
                  transition: "transform 0.15s ease",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform =
                    "scale(1.12)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform =
                    "scale(1)";
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: "translate(-50%, -100%)",
            background: colors.bgSurface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.lg,
            padding: `${spacing.sm} ${spacing.md}`,
            color: colors.textDefault,
            fontSize: font.sm,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          {DAY_NAMES[tooltip.day]} {HOUR_LABELS[tooltip.bucket]}:{" "}
          {tooltip.betCount} bets, {tooltip.wonCount} won ({winPct}%)
        </div>
      )}
    </div>
  );
}
