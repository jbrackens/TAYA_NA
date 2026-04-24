"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (emailStr: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim()) {
      setErrorMessage("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      await forgotPassword({ email });
      setSuccessMessage("Check your email for password reset instructions");
      setSubmitted(true);
      setEmail("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(
        message || "Failed to send reset email. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    marginBottom: "16px",
    backgroundColor: "#0a0f1d",
    border: "1px solid #1a1f3a",
    borderRadius: "4px",
    color: "#e2e8f0",
    fontSize: "14px",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 16px",
    backgroundColor: "var(--accent)",
    border: "none",
    color: "#ffffff",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    transition: "all 0.2s ease",
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "40px",
          backgroundColor: "#0f1225",
          border: "1px solid #1a1f3a",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          <h1
            style={{
              margin: "0 0 8px 0",
              fontSize: "28px",
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            Forgot Password
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#a0a0a0",
            }}
          >
            Enter your email to reset your password
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div
            style={{
              padding: "12px",
              marginBottom: "20px",
              backgroundColor: "#7f1d1d",
              border: "1px solid #991b1b",
              borderRadius: "4px",
              color: "#fca5a5",
              fontSize: "13px",
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div
            style={{
              padding: "12px",
              marginBottom: "20px",
              backgroundColor: "#064e3b",
              border: "1px solid #047857",
              borderRadius: "4px",
              color: "#86efac",
              fontSize: "13px",
            }}
          >
            {successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#e2e8f0",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) setErrorMessage("");
            }}
            placeholder="your@email.com"
            style={inputStyle}
            disabled={submitted}
          />

          <button
            type="submit"
            disabled={isLoading || submitted}
            style={{
              ...buttonStyle,
              opacity: isLoading || submitted ? 0.7 : 1,
              cursor: isLoading || submitted ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !submitted) {
                e.currentTarget.style.backgroundColor = "#ea580c";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--accent)";
            }}
          >
            {isLoading
              ? "Sending..."
              : submitted
                ? "Email Sent"
                : "Send Reset Link"}
          </button>
        </form>

        {/* Divider */}
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
              backgroundColor: "#0f3460",
            }}
          />
          <span
            style={{
              color: "#a0a0a0",
              fontSize: "12px",
            }}
          >
            or
          </span>
          <div
            style={{
              flex: 1,
              height: "1px",
              backgroundColor: "#0f3460",
            }}
          />
        </div>

        {/* Links */}
        <div
          style={{
            textAlign: "center",
            color: "#a0a0a0",
            fontSize: "14px",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            Remember your password?
            <Link
              href="/auth/login"
              style={{
                color: "var(--accent)",
                textDecoration: "none",
                fontWeight: 600,
                marginLeft: "4px",
              }}
            >
              Sign in
            </Link>
          </div>
          <div>
            Don't have an account?
            <Link
              href="/auth/register"
              style={{
                color: "var(--accent)",
                textDecoration: "none",
                fontWeight: 600,
                marginLeft: "4px",
              }}
            >
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
