import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Trophy, LineChart, Lock } from "lucide-react";
import {
  buildProductHomePath,
  resolvePlayerProductFromPath,
} from "../../../../lib/product-routing";

type Mode = "sportsbook" | "prediction";

type ModeToggleProps = {
  isPredictionEnabled: boolean;
  onModeChange?: (mode: Mode) => void;
  className?: string;
};

export const ModeToggle: React.FC<ModeToggleProps> = ({
  isPredictionEnabled,
  onModeChange,
  className,
}) => {
  const router = useRouter();
  const [showTooltip, setShowTooltip] = useState(false);
  const mode = useMemo(
    () => resolvePlayerProductFromPath(router.asPath || router.pathname),
    [router.asPath, router.pathname],
  );

  const setActiveMode = (nextMode: Mode) => {
    if (nextMode === "prediction" && !isPredictionEnabled) {
      return;
    }

    onModeChange?.(nextMode);
    const nextPath = buildProductHomePath(nextMode);
    if ((router.asPath || "").startsWith(nextPath)) {
      return;
    }
    router.push(nextPath);
  };

  const isSportsbook = mode === "sportsbook";
  const sportsbookTextColor = isSportsbook ? "#FFFFFF" : "rgba(177, 186, 211, 0.75)";
  const predictionTextColor =
    !isPredictionEnabled && mode !== "prediction"
      ? "rgba(177, 186, 211, 0.5)"
      : !isSportsbook
      ? "#FFFFFF"
      : "rgba(177, 186, 211, 0.75)";
  const toggleButtonStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 10,
    display: "flex",
    width: "50%",
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: 0,
    borderRadius: 9999,
    padding: "0 16px",
    background: "transparent",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <div
      className={`relative inline-flex items-center rounded-full bg-[#0f212e] p-1 shadow-[0_6px_24px_rgba(0,0,0,0.28)] ${className || ""}`}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 9999,
        padding: 3,
        minWidth: 300,
        background: "#0f212e",
        boxShadow: "none",
        border: "1px solid rgba(177, 186, 211, 0.18)",
      }}
    >
      <motion.div
        className="absolute top-1 bottom-1 rounded-full bg-[#1a2c38]"
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: isSportsbook ? 3 : "calc(50% + 1px)",
          width: "calc(50% - 4px)",
          borderRadius: 9999,
          background: "#1a2c38",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />

      <button
        type="button"
        onClick={() => setActiveMode("sportsbook")}
        className="relative z-10 flex h-11 w-1/2 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors"
        style={{ ...toggleButtonStyle, color: sportsbookTextColor }}
        aria-pressed={isSportsbook}
      >
        <Trophy size={16} strokeWidth={2.25} />
        <span>Sportsbook</span>
      </button>

      <div
        className="relative z-10 w-1/2"
        style={{ position: "relative", zIndex: 10, width: "50%" }}
      >
        <button
          type="button"
          onClick={() => setActiveMode("prediction")}
          disabled={!isPredictionEnabled}
          onMouseEnter={() => setShowTooltip(!isPredictionEnabled)}
          onMouseLeave={() => setShowTooltip(false)}
          className="group flex h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed"
          style={{
            ...toggleButtonStyle,
            width: "100%",
            color: predictionTextColor,
            cursor: isPredictionEnabled ? "pointer" : "not-allowed",
          }}
          aria-disabled={!isPredictionEnabled}
          aria-label={
            isPredictionEnabled
              ? "Switch to Prediction Markets"
              : "Prediction Markets coming soon"
          }
        >
          <LineChart size={16} strokeWidth={2.25} />
          <span>Prediction Markets</span>
          <motion.span
            className="rounded-full bg-[#2f4553] px-1.5 py-[2px] text-[10px] font-extrabold tracking-wide text-[#c4ffd6] animate-pulse"
            animate={{ opacity: [0.7, 1, 0.7], scale: [0.98, 1.04, 0.98] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              lineHeight: 1,
              borderRadius: 9999,
              background: "#2f4553",
              padding: "2px 6px",
              color: "#c4ffd6",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.6,
            }}
          >
            NEW
          </motion.span>
          {!isPredictionEnabled ? <Lock size={13} strokeWidth={2.4} /> : null}
        </button>

        {!isPredictionEnabled && showTooltip ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-30 -translate-x-1/2 rounded-md px-2.5 py-1.5 text-xs font-semibold text-white"
            style={{
              position: "absolute",
              left: "50%",
              top: "calc(100% + 8px)",
              transform: "translateX(-50%)",
              zIndex: 30,
              whiteSpace: "nowrap",
              borderRadius: 6,
              padding: "6px 10px",
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: 600,
              background: "rgba(8, 20, 30, 0.96)",
              border: "1px solid rgba(177, 186, 211, 0.28)",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
            }}
          >
            Coming Soon
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ModeToggle;
