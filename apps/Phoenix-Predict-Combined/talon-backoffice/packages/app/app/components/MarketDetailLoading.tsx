import React from "react";

interface MarketDetailLoadingProps {
  eyebrow: string;
  subtitle: string;
}

export default function MarketDetailLoading({
  eyebrow,
  subtitle,
}: MarketDetailLoadingProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        paddingBottom: "40px",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, #1a0a30 0%, #0f1225 50%, #0a1628 100%)",
          border: "1px solid #22304a",
          borderRadius: "18px",
          padding: "28px",
          boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            color: "#D3D3D3",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: "18px",
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "30px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.08)",
            }}
          />
          <div
            style={{
              width: "62px",
              height: "34px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.06)",
            }}
          />
          <div
            style={{
              flex: 1,
              height: "30px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.08)",
            }}
          />
        </div>
        <div
          style={{
            width: "220px",
            height: "12px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.06)",
            marginTop: "16px",
          }}
        />
      </div>

      <div style={{ fontSize: "13px", color: "#D3D3D3" }}>{subtitle}</div>

      {[0, 1, 2].map((group) => (
        <div
          key={group}
          style={{
            border: "1px solid #22304a",
            borderRadius: "16px",
            background:
              "linear-gradient(180deg, rgba(16,22,36,0.96) 0%, rgba(10,14,25,0.98) 100%)",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "180px",
              height: "16px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.08)",
            }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "10px",
            }}
          >
            {[0, 1, 2].map((cell) => (
              <div
                key={cell}
                style={{
                  minHeight: "68px",
                  borderRadius: "12px",
                  border: "1px solid #2a3245",
                  background:
                    "linear-gradient(180deg, #1b2234 0%, #141a2a 100%)",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    width: "65%",
                    height: "10px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.08)",
                  }}
                />
                <div
                  style={{
                    width: "40%",
                    height: "14px",
                    borderRadius: "999px",
                    background: "rgba(43, 228, 128,0.2)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
