"use client";

import { useState, FormEvent, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// useSearchParams() reads URL state on the client, so static prerender
// must be skipped for this route. Without this, Next.js 16 errors out
// during build with "useSearchParams() should be wrapped in a suspense
// boundary at page /auth/login". The Suspense fallback below is a
// secondary safety net for any future static-export attempt.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      // Store tokens in the legacy @phoenix-ui/utils token store (localStorage)
      // so the Pages Router session guard can find them. The Go gateway returns
      // opaque bearer tokens (atk_...) instead of JWTs — the dev-mode bypass
      // in utils/auth.ts accepts these without JWT validation.
      const accessToken = data.accessToken || data.token || "";
      const refreshToken = data.refreshToken || data.refresh_token || "";
      if (accessToken) {
        localStorage.setItem("JdaToken", accessToken);
        if (refreshToken) {
          localStorage.setItem("RefreshToken", refreshToken);
        }
        // Set generous expiry so the session guard doesn't expire the token
        const oneHourMs = Date.now() + (data.expiresInSeconds || 3600) * 1000;
        localStorage.setItem("JdaTokenExpDate", JSON.stringify(oneHourMs));
        if (refreshToken) {
          const refreshExpiry =
            Date.now() + (data.refreshExpiresInSeconds || 7200) * 1000;
          localStorage.setItem(
            "RefreshTokenExpDate",
            JSON.stringify(refreshExpiry),
          );
        }
      }

      const destination = returnUrl.startsWith("/") ? returnUrl : "/dashboard";
      window.location.assign(destination);
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "var(--surface-1, #ffffff)",
    border: `1.5px solid ${
      focusedField === field
        ? "var(--focus-ring, #0e7a53)"
        : "var(--border-1, #e5dfd2)"
    }`,
    borderRadius: 8,
    color: "var(--t1, #1a1a1a)",
    fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxShadow:
      focusedField === field
        ? "0 0 0 3px var(--accent-soft, rgba(43, 228, 128, 0.14))"
        : "none",
    boxSizing: "border-box" as const,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--bg-deep, #f7f3ed)",
        backgroundImage: "var(--bg-pattern)",
        backgroundSize: "var(--bg-pattern-size, 32px 32px)",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "44px 40px",
          background: "var(--surface-1, #ffffff)",
          borderRadius: 16,
          border: "1px solid var(--border-1, #e5dfd2)",
          boxShadow:
            "0 12px 48px rgba(26, 26, 26, 0.06), 0 1px 2px rgba(26, 26, 26, 0.04)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <img
            src="/logo-tn.png"
            alt="TAYA NA!"
            style={{ width: 56, height: 56, marginBottom: 16 }}
          />
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--t1, #1a1a1a)",
              marginBottom: 6,
              letterSpacing: "-0.01em",
            }}
          >
            TAYA NA! Backoffice
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--t2, #4a4a4a)",
              fontWeight: 400,
            }}
          >
            Sign in to your admin account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          {error && (
            <div
              style={{
                padding: "12px 16px",
                background: "var(--no-soft, rgba(255, 139, 107, 0.16))",
                border: "1px solid var(--no, #ff8b6b)",
                borderRadius: 8,
                color: "var(--no-text, #a8472d)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--t2, #4a4a4a)",
                letterSpacing: "0.02em",
              }}
            >
              Email
            </label>
            <input
              type="email"
              placeholder="admin@phoenix.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField("")}
              style={inputStyle("email")}
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--t2, #4a4a4a)",
                  letterSpacing: "0.02em",
                }}
              >
                Password
              </label>
              <a
                href="#"
                style={{
                  fontSize: 12,
                  color: "var(--focus-ring, #0e7a53)",
                  fontWeight: 500,
                }}
              >
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField("")}
              style={inputStyle("password")}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 20px",
              marginTop: 4,
              background: loading
                ? "var(--accent-soft, rgba(43, 228, 128, 0.14))"
                : "var(--accent, #2be480)",
              border: "none",
              borderRadius: 8,
              color: loading ? "var(--t3, #8b8378)" : "#003827",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.2s",
              opacity: loading ? 0.7 : 1,
              boxShadow: loading
                ? "none"
                : "0 4px 12px rgba(43, 228, 128, 0.18)",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: 28,
            fontSize: 12,
            color: "var(--t3, #8b8378)",
          }}
        >
          TAYA NA Predict Admin
        </p>
      </div>
    </div>
  );
}
