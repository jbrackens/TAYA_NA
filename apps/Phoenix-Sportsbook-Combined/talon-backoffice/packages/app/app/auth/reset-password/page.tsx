"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "../../lib/api";

interface Errors {
  [key: string]: string;
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMessage(
        "Invalid or missing reset token. Please request a new password reset.",
      );
    }
  }, [token]);

  const validateForm = (): boolean => {
    const newErrors: Errors = {};

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!token) {
      setErrorMessage("Invalid or missing reset token");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({
        token,
        new_password: password,
      });

      setSuccessMessage("Password reset successfully! Redirecting to login...");
      setSubmitted(true);

      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message || "Failed to reset password. Please try again.");
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

  const errorStyle: React.CSSProperties = {
    color: "#ef4444",
    fontSize: "12px",
    marginTop: "-12px",
    marginBottom: "12px",
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 16px",
    backgroundColor: "#39ff14",
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
            Reset Password
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#a0a0a0",
            }}
          >
            Enter your new password
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
        {!submitted && token && (
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
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.password;
                    return newErrors;
                  });
                }
              }}
              placeholder="At least 8 characters"
              style={inputStyle}
              disabled={isLoading}
            />
            {errors.password && <div style={errorStyle}>{errors.password}</div>}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.confirmPassword;
                    return newErrors;
                  });
                }
              }}
              placeholder="Confirm your password"
              style={inputStyle}
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <div style={errorStyle}>{errors.confirmPassword}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                ...buttonStyle,
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = "#ea580c";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#39ff14";
              }}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

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
            <Link
              href="/auth/login"
              style={{
                color: "#39ff14",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Back to Login
            </Link>
          </div>
          <div>
            Need help?
            <Link
              href="/auth/forgot-password"
              style={{
                color: "#39ff14",
                textDecoration: "none",
                fontWeight: 600,
                marginLeft: "4px",
              }}
            >
              Request another reset
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
