"use client";

import Link from "next/link";
import LoginForm from "../../components/LoginForm";

export default function LoginPage() {
  const isLocalDev = process.env.NODE_ENV !== "production";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "32px 20px",
        background:
          "radial-gradient(circle at top, rgba(57,255,20,0.08), transparent 26%), linear-gradient(180deg, #0a0d18 0%, #0d1120 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "40px 40px 32px",
          background:
            "linear-gradient(180deg, rgba(15,18,37,0.96) 0%, rgba(10,14,28,0.98) 100%)",
          border: "1px solid rgba(57,255,20,0.14)",
          borderRadius: "18px",
          boxShadow:
            "0 28px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "120px",
              padding: "6px 12px",
              marginBottom: "18px",
              borderRadius: "999px",
              border: "1px solid rgba(57,255,20,0.16)",
              background: "rgba(57,255,20,0.08)",
              color: "#8cf55d",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Player Access
          </div>
          <h1
            style={{
              margin: "0 0 8px 0",
              fontSize: "32px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#ffffff",
            }}
          >
            TAYA NA!
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              color: "#D3D3D3",
              lineHeight: 1.6,
            }}
          >
            Sign in to track live markets, manage bets, and stay ready for the
            next price move.
          </p>
        </div>

        <LoginForm />

        {isLocalDev && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "rgba(19, 28, 56, 0.92)",
              border: "1px solid rgba(87, 126, 255, 0.24)",
              color: "#cfe0ff",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#8fb9ff",
                marginBottom: "6px",
              }}
            >
              Local Demo Access
            </div>
            <div>
              Use <strong>demo@phoenix.local</strong> with password{" "}
              <strong>demo123</strong>.
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            margin: "24px 0",
            gap: "12px",
          }}
        >
          <div
            style={{
              flex: 1,
              height: "1px",
              backgroundColor: "#1f2a4a",
            }}
          />
          <span
            style={{
              color: "#D3D3D3",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            or continue with
          </span>
          <div
            style={{
              flex: 1,
              height: "1px",
              backgroundColor: "#1f2a4a",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <button
            type="button"
            style={{
              padding: "11px 12px",
              backgroundColor: "#111933",
              border: "1px solid #28477b",
              color: "#d7e7ff",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "13px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#18325b";
              e.currentTarget.style.borderColor = "#4a7eff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#111933";
              e.currentTarget.style.borderColor = "#28477b";
            }}
          >
            Google
          </button>
          <button
            type="button"
            style={{
              padding: "11px 12px",
              backgroundColor: "#111933",
              border: "1px solid #28477b",
              color: "#d7e7ff",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "13px",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#18325b";
              e.currentTarget.style.borderColor = "#4a7eff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#111933";
              e.currentTarget.style.borderColor = "#28477b";
            }}
          >
            Apple
          </button>
        </div>

        <div
          style={{
            textAlign: "center",
            color: "#D3D3D3",
            fontSize: "14px",
          }}
        >
          Don&apos;t have an account?
          <Link
            href="/auth/signup"
            style={{
              color: "#7fb8ff",
              textDecoration: "none",
              fontWeight: 600,
              marginLeft: "4px",
            }}
          >
            Sign up here
          </Link>
        </div>
      </div>
    </div>
  );
}
