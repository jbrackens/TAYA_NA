"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "react-i18next";

const Button: React.FC<
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style"> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
  }
> = ({
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled,
  ...rest
}) => {
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-[18px] py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  };
  const variants = {
    primary: "border-0 bg-[var(--accent)] text-[#101114]",
    secondary: "border border-[#2a3150] bg-[#1a1f3a] text-[#e2e8f0]",
    ghost: "border-0 bg-transparent text-[#818cf8]",
    danger: "border-0 bg-[#ef4444] text-white",
  };
  return (
    <button
      {...rest}
      disabled={disabled}
      className={`whitespace-nowrap rounded-lg font-semibold transition-opacity duration-150 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "style"> & {
    error?: boolean;
  }
>(({ error, className = "", ...rest }, ref) => (
  <input
    ref={ref}
    {...rest}
    className={`w-full rounded-lg border bg-[#0b0e1c] px-3.5 py-2.5 text-sm text-[#f1f5f9] outline-none transition-[border-color] duration-150 ${
      error ? "border-[#ef4444]" : "border-[#1e2243]"
    } ${className}`}
  />
));
Input.displayName = "Input";

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { t, ready } = useTranslation("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const tx = (key: string, fallback: string) =>
    ready ? t(key, { defaultValue: fallback }) : fallback;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Validate inputs
      if (!username.trim() || !password.trim()) {
        setError(tx("ENTER_CREDENTIALS", "Enter your username and password."));
        return;
      }

      if (password.length < 6) {
        setError(
          tx("PASSWORD_MIN_LENGTH", "Password must be at least 6 characters."),
        );
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
      const message =
        err instanceof Error
          ? err.message
          : tx("LOGIN_FAILED", "Login failed.");
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded border border-[var(--no)] bg-[rgba(255,155,107,0.13)] p-3 text-[13px] text-[var(--no)]">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="username" className="text-sm font-semibold text-white">
          {tx("USERNAME", "Username")}
        </label>
        <Input
          id="username"
          type="text"
          placeholder={tx("USERNAME_PLACEHOLDER", "Enter your username")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-semibold text-white">
          {tx("PASSWORD", "Password")}
        </label>
        <Input
          id="password"
          type="password"
          placeholder={tx("PASSWORD_PLACEHOLDER", "Enter your password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="rememberMe"
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          disabled={isLoading}
          className="h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
        />
        <label
          htmlFor="rememberMe"
          className="cursor-pointer text-[13px] text-[#a0a0a0]"
        >
          {tx("REMEMBER_ME", "Remember me")}
        </label>
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading
          ? tx("SIGNING_IN", "Signing in...")
          : tx("SIGN_IN", "Log In")}
      </Button>
    </form>
  );
};

export default LoginForm;
