"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "react-i18next";

const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
  }
> = ({
  variant = "primary",
  size = "md",
  children,
  style,
  disabled,
  ...rest
}) => {
  const sizes = {
    sm: { padding: "6px 12px", fontSize: 12 },
    md: { padding: "10px 18px", fontSize: 14 },
    lg: { padding: "14px 24px", fontSize: 16 },
  };
  const variants = {
    primary: { background: "#39ff14", color: "#101114", border: "none" },
    secondary: {
      background: "#1a1f3a",
      color: "#e2e8f0",
      border: "1px solid #2a3150",
    },
    ghost: { background: "transparent", color: "#818cf8", border: "none" },
    danger: { background: "#ef4444", color: "#fff", border: "none" },
  };
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        ...sizes[size],
        ...variants[variant],
        borderRadius: 8,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s",
        whiteSpace: "nowrap" as const,
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(({ error, style, ...rest }, ref) => (
  <input
    ref={ref}
    {...rest}
    style={{
      width: "100%",
      padding: "10px 14px",
      borderRadius: 8,
      fontSize: 14,
      background: "#0b0e1c",
      border: `1px solid ${error ? "#ef4444" : "#1e2243"}`,
      color: "#f1f5f9",
      outline: "none",
      transition: "border-color 0.15s",
      ...style,
    }}
  />
));
Input.displayName = "Input";

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Validate inputs
      if (!username.trim() || !password.trim()) {
        setError(t("ENTER_CREDENTIALS"));
        return;
      }

      if (password.length < 6) {
        setError(t("PASSWORD_MIN_LENGTH"));
        return;
      }

      // Attempt login
      await login(username, password);

      // Store remember me preference
      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
          localStorage.setItem("rememberedUsername", username);
        } else {
          localStorage.removeItem("rememberMe");
          localStorage.removeItem("rememberedUsername");
        }
      }

      // Redirect on success
      onSuccess?.();
      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("LOGIN_FAILED");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load remembered username on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const remembered = localStorage.getItem("rememberMe") === "true";
      const savedUsername = localStorage.getItem("rememberedUsername");
      if (remembered && savedUsername) {
        setUsername(savedUsername);
        setRememberMe(true);
      }
    }
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {error && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "rgba(248, 113, 113, 0.13)",
            border: "1px solid #f87171",
            color: "#f87171",
            borderRadius: "4px",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <label
          htmlFor="username"
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#ffffff",
          }}
        >
          {t("USERNAME")}
        </label>
        <Input
          id="username"
          type="text"
          placeholder={t("USERNAME_PLACEHOLDER")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <label
          htmlFor="password"
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#ffffff",
          }}
        >
          {t("PASSWORD")}
        </label>
        <Input
          id="password"
          type="password"
          placeholder={t("PASSWORD_PLACEHOLDER")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <input
          id="rememberMe"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          disabled={isLoading}
          style={{
            width: "16px",
            height: "16px",
            cursor: "pointer",
          }}
        />
        <label
          htmlFor="rememberMe"
          style={{
            fontSize: "13px",
            color: "#a0a0a0",
            cursor: "pointer",
          }}
        >
          {t("REMEMBER_ME")}
        </label>
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={isLoading}
        style={{ width: "100%" }}
      >
        {isLoading ? t("SIGNING_IN") : t("SIGN_IN")}
      </Button>
    </form>
  );
};

export default LoginForm;
